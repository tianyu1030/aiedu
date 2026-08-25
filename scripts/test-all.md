# scripts/test-all.mjs 使用说明

> 本脚本是 **闭环验收（Task 13）+ 全量功能测试（Task 14）** 的统一入口，双模式设计：
>
> - **HTTP 模式（默认）**：启动 Next.js dev server 后，通过 `fetch(http://localhost:3000/api/...)` 黑盒调全部业务接口
> - **DB 模式（`--mode db`）**：**无需启动 Next.js**，直接 `mysql2` 直连 MySQL 执行参数化 SQL 进行白盒校验

两种模式都 **绝对不执行清库（无 DELETE / TRUNCATE / DROP）**，默认行为即 `--no-clean`，若显式传 `--clean` 会直接退出报错。

---

## 1. 前置依赖

| 项目 | 要求 | 检查命令 |
| --- | --- | --- |
| Node.js | ≥ 18.17，推荐 18.20 LTS / 20.x | `node -v` |
| npm 依赖 | 项目 `package.json` 已安装 | `ls node_modules/mysql2` |
| 环境变量（.env.local） | `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` <br> 可选 `JWT_SECRET`（DB 模式必选） | `cat .env.local` |
| Next.js dev server（仅 HTTP 模式） | `http://127.0.0.1:3000` 已可访问 | `curl http://localhost:3000` |

### 1.1 安装依赖

Windows PowerShell 5 请使用 `.cmd` 版本，避免 `.ps1` 执行策略报错：

```powershell
cd f:\2025shiben\aiedu
npm.cmd install
```

> 若 TRAE 沙箱拦截 npm registry（这是大概率事件），请把代码下载到本地机器（或非沙箱环境）执行 `npm install` 后再跑脚本；本地网络如果也受限，可手动挂载已安装好的 node_modules。

---

## 2. 运行方式

### 2.1 HTTP 模式（推荐跑全量接口）

**先启动 Next.js dev server**（新终端开一个窗口）：

```powershell
# PowerShell 终端 1
cd f:\2025shiben\aiedu
npm.cmd run dev
# 启动成功会显示：ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**再运行脚本**（另开终端）：

```powershell
# PowerShell 终端 2
cd f:\2025shiben\aiedu
node scripts/test-all.mjs
```

如 dev 端口不是 3000，用环境变量覆盖：

```powershell
$env:TEST_BASE_URL="http://localhost:3001"
node scripts/test-all.mjs
```

### 2.2 DB 模式（本机无 Node frontend / 不想启动 dev，仅校验 DB 层隔离/约束）

```powershell
cd f:\2025shiben\aiedu
node scripts/test-all.mjs --mode db
# 或者
$env:TEST_MODE="db"
node scripts/test-all.mjs
```

DB 模式会：
1.  直连 `MYSQL_URL/.env.local` 里的 MySQL；
2.  自动用 `e2e-<TS>@example.com` 邮箱插入两个测试用户（bcrypt cost=10），无需调用 HTTP 登录；
3.  执行参数化 INSERT/SELECT 校验：
    - 密码 bcrypt 哈希 cost=10 存储 + compare 通过 `DB-AUTH-1`
    - `users.email` UNIQUE 索引阻止重复注册 `DB-AUTH-2`
    - classes/students/records 三张表 `user_id` 与归属一致性 `DB-CLS-1`
    - 跨账号查询 B→A 数据必须 0 行（等价于 API 层 `WHERE user_id = ?` 语义）`DB-ISO-1`
    - Schema 必建索引存在性 `DB-NF-5`

---

## 3. 用例覆盖对应表

| tests/test-case-list.md 条目 | HTTP 模式 id | DB 模式 id |
| --- | --- | --- |
| AUTH-001 ~ 010 | AUTH-001 ~ 010 | DB-AUTH-1, DB-AUTH-2 |
| CLS-001 ~ 008 | CLS-001 ~ 006（删除级联留人工） | DB-CLS-1, DB-ISO-1 |
| STU-001 ~ 010 | STU-001 ~ 006, STU-008, STU-010 | — |
| REC-001 ~ 007 | REC-001 ~ 007 | DB-REC-1 |
| GEN-001 ~ 010 | GEN-001, 002 (若 AI 可达), GEN-003 | — |
| DASH-001 | DASH-001 | — |
| UI / NAV / SETT 页面可达 | P-login/register/homepage/dashboard/classes/students/records/generate/settings 共 9 项 | — |
| NF 数据隔离（HTTP 层） | AUTH-010, CLS-006, STU-006, REC-007 | DB-ISO-1 |
| Schema 索引 | — | DB-NF-5 |

---

## 4. 退出码 & 结果分析

| 退出码 | 含义 | 建议动作 |
| --- | --- | --- |
| 0 | 全部用例 PASS | 标记验收通过 |
| 1 | 存在 FAIL | 看控制台「失败用例详情」块，按缺陷记录修正后重跑 |
| 2 | 环境校验失败 | ① 依赖未装 → `npm.cmd install` <br> ② HTTP 模式连不上 → 确认 `npm.cmd run dev` 已在跑 <br> ③ DB 模式缺 env → 检查 `.env.local` |

脚本在每个失败用例下都会打印三行：
- `· 描述`：场景简要说明
- `· 期望`：按需求文档写出的断言（例如 409、`{ok:true}` 等）
- `· 实际`：该次运行真实的 status / body 内容

---

## 5. 关于不清库（重要 ⚠）

脚本中 **无任何 DELETE / TRUNCATE 语句**，所有自动产生的账号/班级/学生均带前缀：

- 邮箱：`e2e-<ts>-@example.com`
- 班级名 / 学生名：`e2e-...` 开头

建议测试 1 周后在 MySQL 中人工清理：

```sql
-- 可选：人工清理 e2e- 前缀数据（执行前请 SELECT 确认再删，本脚本不提供）
SELECT id, email FROM users WHERE email LIKE 'e2e-%@example.com';
```

---

## 6. 常见问题 FAQ

- **Q1：`TypeError: fetch is not a function`**
  A：Node 版本 < 18，fetch 未内建；请升级到 Node ≥ 18.17。
- **Q2：`Cannot find package 'mysql2'`**
  A：未执行 `npm install`。
- **Q3：HTTP 模式连不上，报 `请确认已执行 npm run dev`**
  A：`npm run dev` 启动了但端口不是 3000 → 用 `TEST_BASE_URL=http://localhost:<port>` 覆盖；
  或直接改用 `node scripts/test-all.mjs --mode db`。
- **Q4：GEN-001 / GEN-002（AI 生成）被自动跳过**
  A：通常是沙箱拦截 DeepSeek 公网 TCP（`api.deepseek.com:443`）、或 `DEEPSEEK_API_KEY` 限流/失效。该用例对网络敏感，脚本在 **429 / 5xx / fetch() throw** 时会显示 `⚠ [正向] GEN-001/GEN-002 跳过`，不判定为 FAIL，仅在 **4xx（非 429）** 时置 FAIL（说明请求构造 / 校验层出错）。
- **Q5：沙箱里完全跑不起来怎么办？**
  A：将本仓库（含 `.env.local`，注意 `DEEPSEEK_API_KEY` 为机密）下载到本地，按 2.1 / 2.2 步骤执行即可。
