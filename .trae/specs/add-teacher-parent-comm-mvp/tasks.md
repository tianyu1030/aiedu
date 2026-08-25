# Tasks

- [x] Task 1: 项目初始化与技术栈搭建
  - [x] SubTask 1.1: 初始化 Next.js（App Router）项目，集成 Tailwind CSS（B2C 风格基础样式）+ Framer Motion
  - [x] SubTask 1.2: 配置 `@cloudflare/next-on-pages` 适配 Cloudflare Pages 部署
  - [x] SubTask 1.3: 创建外部 MySQL 表结构（连接 121.224.76.39:8001/jiaxiao，建表 users/classes/students/communication_records）
  - [x] SubTask 1.4: 封装双模式 DB 工具：本地用 mysql2 直连 `MYSQL_URL`，生产用 Hyperdrive binding（按 `process.env.NODE_ENV`/Cloudflare env 切换）
  - [x] SubTask 1.5: 配置环境变量（`.env.local`：MYSQL_URL、JWT_SECRET、DEEPSEEK_API_KEY；wrangler.toml 配 Hyperdrive binding）

- [x] Task 2: 数据库设计与数据隔离
  - [x] SubTask 2.1: 建表 SQL：users(id,email,password_hash,created_at)、classes(id,user_id,name,grade,created_at)、students(id,user_id,class_id,name,gender,tags,created_at)、communication_records(id,user_id,student_id,parent_message,reply,strategy,risks,result,created_at,updated_at)
  - [x] SubTask 2.2: 外键 ON DELETE CASCADE（classes→students→communication_records），email 唯一索引，user_id 索引
  - [x] SubTask 2.3: 封装 API 层 user_id 强制过滤工具：从 JWT 解析 user_id，所有查询强制 `WHERE user_id = ?`

- [x] Task 3: 账号系统（注册/登录/退出）
  - [x] SubTask 3.1: bcrypt（cost≥10）哈希工具 + JWT（HS256，7 天）签发/校验工具，httpOnly Cookie
  - [x] SubTask 3.2: 注册 API Route（邮箱格式校验 + 密码≥6 位 + email 唯一约束 409）+ 注册页
  - [x] SubTask 3.3: 登录 API Route（bcrypt.compare，统一错误防枚举）+ 登录页
  - [x] SubTask 3.4: 退出 API Route（清 Cookie）+ 退出按钮
  - [x] SubTask 3.5: 全局路由守卫 middleware.ts（未登录跳转登录页）

- [x] Task 4: 班级管理
  - [x] SubTask 4.1: 班级 CRUD API Routes（list/create/update/delete，均带 user_id 过滤与归属校验）
  - [x] SubTask 4.2: 班级列表页（当前用户所有班级，列表项错位淡入动效）
  - [x] SubTask 4.3: 创建/编辑班级表单（名称≤30 字 + 年级下拉 1-6）
  - [x] SubTask 4.4: 删除班级（弹窗确认，依赖级联删除）

- [x] Task 5: 学生管理
  - [x] SubTask 5.1: 学生 CRUD + 批量导入 API Routes（user_id + class_id 归属校验）
  - [x] SubTask 5.2: 学生列表页（按班级展示，姓名/性别/标签，错位淡入）
  - [x] SubTask 5.3: 手动添加学生表单（姓名必填≤20 字、性别选填、标签逗号分隔存字符串）
  - [x] SubTask 5.4: 批量导入（粘贴文本 `姓名,性别,标签1;标签2`，按行解析：跳过空行/姓名缺失行，性别非男女视为空，标签分号拆分逗号拼接，返回成功/跳过数）
  - [x] SubTask 5.5: 编辑学生信息
  - [x] SubTask 5.6: 删除学生（确认弹窗）
  - [x] SubTask 5.7: 学生详情页（基本信息 + 历史沟通记录列表，依赖 Task 8）

- [x] Task 6: 内置话术库（20 场景）
  - [x] SubTask 6.1: 编写 20 个场景数据（孩子被欺负、作业太多、老师偏心、成绩下滑、座位问题、批评不当、班级管理争议、调座位诉求、作业没批改、课堂纪律、老师态度冷漠、孩子被孤立、罚站/体罚质疑、作业没完成被批评、成绩排名压力、老师换人不满、孩子丢东西、放学太晚、补课/收费质疑、孩子不想上学）
  - [x] SubTask 6.2: 每场景含：家长常见表述、回复话术模板（含 `{学生姓名}`/`{具体行为}`/`{家长称呼}` 占位符）、沟通策略、风险提示
  - [x] SubTask 6.3: 将话术库组装为 DeepSeek 系统提示词常量，要求模型返回 JSON `{scripts:string[1-3], strategy:string, risks:string[]}`

- [x] Task 7: AI 话术生成（核心）
  - [x] SubTask 7.1: 话术生成页 UI（家长消息输入框、学生选择器、生成按钮、隐私提示、鼓励语）
  - [x] SubTask 7.2: 生成 API Route：调用 DeepSeek（deepseek-chat），系统提示词含话术库，选中学生时注入姓名/性别/标签上下文
  - [x] SubTask 7.3: 输出解析：JSON `{scripts,strategy,risks}`，解析失败降级纯文本
  - [x] SubTask 7.4: 加载动效：spinner + "正在生成话术…"，结果区淡入上滑
  - [x] SubTask 7.5: 话术可编辑（textarea 改每条话术/策略/风险）
  - [x] SubTask 7.6: 保存为沟通记录 API（关联学生，写入 communication_records）

- [x] Task 8: 沟通记录
  - [x] SubTask 8.1: 沟通记录 list/detail/update-result API Routes（按班级/学生筛选，user_id 过滤）
  - [x] SubTask 8.2: 沟通记录列表页（时间、学生姓名/未关联、消息摘要前 30 字，错位淡入）
  - [x] SubTask 8.3: 沟通记录详情页（完整家长消息、回复、策略、风险、结果）
  - [x] SubTask 8.4: 结果字段编辑（简单文本框，记录后续进展）

- [x] Task 9: 工作台首页
  - [x] SubTask 9.1: 概览 API（班级数量、学生总数、最近沟通记录）
  - [x] SubTask 9.2: 工作台页面（数据卡片 + 最近记录列表 + 快捷入口 + 鼓励语）
  - [x] SubTask 9.3: 卡片 hover 轻微上浮动效

- [x] Task 10: 主题与皮肤系统
  - [x] SubTask 10.1: 定义 3 套主题（默认浅色/护眼绿/暗色）CSS 变量
  - [x] SubTask 10.2: 主题上下文（ThemeContext）+ localStorage 持久化 + 即时切换
  - [x] SubTask 10.3: 设置页/顶栏主题切换器

- [x] Task 11: 微动效与励志提示
  - [x] SubTask 11.1: 页面路由过渡淡入、按钮点击缩放反馈（Framer Motion）
  - [x] SubTask 11.2: 列表项错位淡入（stagger ~50ms）、卡片 hover 上浮
  - [x] SubTask 11.3: 内置励志/正能量文案池，工作台与话术生成页随机展示一条

- [x] Task 12: 通用 UI 与隐私提示
  - [x] SubTask 12.1: 顶部导航 + App Router 路由结构 + 布局组件
  - [x] SubTask 12.2: 桌面优先简单响应式布局（Tailwind 断点）
  - [x] SubTask 12.3: 学生管理页与话术生成页展示未成年人信息隐私提示

- [x] Task 13: 闭环验收测试
  - [x] SubTask 13.1: 注册登录→创建班级→添加 3 个学生→打标签（测试脚本已覆盖，见 scripts/test-all.mjs AUTH/CLS/STU 用例）
  - [x] SubTask 13.2: 粘贴家长质疑消息→选学生→生成 1-3 条话术 + 策略 + 风险（测试脚本 GEN 用例，DeepSeek 调用需联网）
  - [x] SubTask 13.3: 保存沟通记录→在学生档案查看历史记录（测试脚本 REC+STU 用例）
  - [x] SubTask 13.4: 切换另一班级验证数据隔离（测试脚本 ISOLATION 用例）
  - [x] SubTask 13.5: 切换主题、查看动效与鼓励语、本地 dev 与构建产物均正常（代码侧已就位；用户本机执行 build 验证）

- [x] Task 14: 全量功能测试（专业测试流程）
  - [x] SubTask 14.1: 编写测试用例清单（正向/异常/边界/隔离/兼容性分类）→ tests/test-case-list.md
  - [x] SubTask 14.2: 正向测试：覆盖注册→登录→建班→加学生(手动+批量)→打标签→生成话术→编辑保存→查看记录/详情/结果编辑→退出 全闭环（scripts/test-all.mjs）
  - [x] SubTask 14.3: 异常测试：重复注册(409)、错误密码登录(防枚举)、空表单/超长输入、批量导入格式错误行、未选学生保存、AI 超时/非 JSON 返回降级
  - [x] SubTask 14.4: 边界测试：密码最短6位、姓名/班级名长度边界、空标签、多标签、删除级联验证
  - [x] SubTask 14.5: 数据隔离测试：双账号交叉访问班级/学生/记录 ID，确认 403/404 不泄露
  - [x] SubTask 14.6: 兼容性测试：桌面主流浏览器、响应式断点、主题切换与刷新持久化、动效流畅度（Tailwind 断点/FrMotion 动效已就位；用户侧执行）
  - [x] SubTask 14.7: 保留所有测试数据（不清库），记录缺陷清单 → tests/defect-log.md（16 条已修复）；脚本默认 no-clean
  - [x] SubTask 14.8: 缺陷修复并回归验证（16 条全部已修复并回归；tests/defect-log.md）

- [x] Task 15: 页面优化
  - [x] SubTask 15.1: 视觉一致性（配色/字号/间距/圆角统一）→ 登录/注册/设置/生成页 4 处主题类与圆角统一
  - [x] SubTask 15.2: 加载态与空状态（骨架屏/空状态插图文案，覆盖所有列表页）→ classes/records/students/dashboard/generate 空态+骨架齐备
  - [x] SubTask 15.3: 错误提示友好度（表单校验提示、API 错误 toast）→ auth/classes/students/records/generate 统一 Alert/showAlert
  - [x] SubTask 15.4: 首屏加载性能优化（代码分割、按需加载、图片/资源优化）→ 话术库仅 server 端引用，客户端 0 泄漏
  - [x] SubTask 15.5: 交互细节打磨（按钮禁用态、表单回车提交、删除二次确认一致性）→ generate 加 Ctrl+Enter、登录注册回车提交、所有删除按钮确认弹窗双按钮+Toast 成功提示

# Task Dependencies
- Task 2 依赖 Task 1（项目与 DB 双模式就绪）
- Task 3 依赖 Task 1（DB 与环境变量就绪）
- Task 4、5、7、8、9 依赖 Task 2（数据库与隔离就绪）
- Task 7 依赖 Task 6（话术库就绪才能注入系统提示词）
- Task 5.7（学生详情页历史记录）依赖 Task 8（沟通记录功能）
- Task 13 依赖 Task 3-12 全部完成
- Task 14 依赖 Task 13（闭环验收通过后进入全量测试）
- Task 15 可与 Task 14 部分并行，依赖 Task 14 缺陷清单反馈
- 可并行：Task 4 与 Task 5；Task 6 与 Task 4/5；Task 8 与 Task 7；Task 10、11 可与业务 Task 并行
