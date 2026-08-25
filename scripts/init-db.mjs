// 一次性建表脚本：连接 MySQL 并执行 src/db/schema.sql
// 用法: npm run db:init
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPool } from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// 简易 .env.local 加载器（无第三方依赖）
function loadEnv() {
  const envPath = join(root, ".env.local");
  let content = "";
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !user || !database) {
  console.error("缺少 DB_HOST / DB_USER / DB_NAME 环境变量，请检查 .env.local");
  process.exit(1);
}

const sql = readFileSync(join(root, "src", "db", "schema.sql"), "utf8");
const seedSql = readFileSync(join(root, "src", "db", "seed.sql"), "utf8");

const pool = createPool({
  host,
  port,
  user,
  password,
  multipleStatements: true,
  // 远程 MySQL 可能未启用 SSL，这里不强制 SSL
  ssl: undefined,
});

try {
  console.log(`正在连接 MySQL ${host}:${port} ...`);
  const conn = await pool.getConnection();
  console.log("连接成功，开始执行 schema.sql ...");
  await conn.query(sql);
  console.log("建表完成，开始执行 seed.sql（话术库初始数据）...");
  await conn.query(seedSql);

  // 统计话术库数据量
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM `script_library`"
  );
  console.log(`话术库已写入 ${rows[0].cnt} 条场景数据。`);

  conn.release();

  const [tables] = await pool.query(
    "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
    [database]
  );
  console.log(`\n初始化完成。库 ${database} 现有表：`);
  for (const t of tables) console.log("  -", t.TABLE_NAME);
  process.exit(0);
} catch (err) {
  console.error("\n初始化失败：", err.message);
  process.exit(1);
}
