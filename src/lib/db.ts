import {
  createPool,
  type Pool,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

let _pool: Pool | null = null;

/**
 * 获取（惰性创建）连接池。
 * 本地与生产均通过 MYSQL_URL 直连 MySQL（自有 Linux 服务器部署）。
 */
export async function getPool(): Promise<Pool> {
  if (_pool) return _pool;

  const connectionString = process.env.MYSQL_URL;
  if (connectionString) {
    _pool = createPool(connectionString);
    return _pool;
  }

  // 回退：DB_* 单项参数
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  if (!host || !database) {
    throw new Error("缺少数据库连接配置：请设置 MYSQL_URL 或 DB_HOST/DB_NAME");
  }
  const config: PoolOptions = {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  _pool = createPool(config);
  return _pool;
}

/**
 * 执行查询，返回结果行。
 * @example const users = await query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
 */
export async function query<T = RowDataPacket[] | ResultSetHeader>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export type { RowDataPacket, ResultSetHeader };
