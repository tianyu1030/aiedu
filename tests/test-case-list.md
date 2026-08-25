# 家校沟通话术助手 — 测试用例清单

> 覆盖范围：`checklist.md` 账号系统 / 班级管理 / 学生管理 / 沟通记录 / AI 话术生成 / 主题与皮肤 / 动效 / 励志语 / 页面 / 非功能 / 最小闭环 / 全量功能测试 / 页面优化 全部 8 大场景。
> 分类：正向 ✅ / 异常 ⚠️ / 边界 🔲 / 隔离 🔒 / 兼容性 🖥️

---

## 一、账号系统（Auth）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| AUTH-001 | 正向✅ | 数据库无 `test-user-{ts}@example.com` | 1. 访问 `/register` <br> 2. 填写合法邮箱 + 6 位以上密码 <br> 3. 点「注册」 | HTTP 303/前端跳转 `/dashboard`；Cookies 含 `token`；`users.password_hash` 为 bcrypt（cost=10）哈希 | `POST /api/auth/register` <br> `src/app/(auth)/register/page.tsx` |
| AUTH-002 | 异常⚠️ | 已存在注册用户邮箱 `a@example.com` | 再次使用相同邮箱调用 `/api/auth/register` | 返回 `409 Conflict`；body `{ error: "该邮箱已注册" }` | `POST /api/auth/register` |
| AUTH-003 | 边界🔲 | — | 注册时密码恰好 5 位 、密码恰好 6 位 | 5 位：400 `{error:"密码至少 6 位"}`；6 位：注册成功 | `POST /api/auth/register` |
| AUTH-004 | 异常⚠️ | — | 注册邮箱 `invalid-email`（无@）/ 空值 / 纯空格 | 400 `{error:"邮箱格式不正确"}` | `POST /api/auth/register` |
| AUTH-005 | 正向✅ | 用户 `a@example.com` 密码 `abcdef` 已注册 | 调用 `/api/auth/login` 正确密码 | 200 `{ok:true,user:{id,email}}`；Set-Cookie `token`（httpOnly，path=/，maxAge=7d） | `POST /api/auth/login` |
| AUTH-006 | 异常⚠️ | — | 输入错误密码 / 不存在的邮箱（两种分别测） | 统一返回 401 `{error:"邮箱或密码错误"}`，不暴露邮箱是否存在 | `POST /api/auth/login` |
| AUTH-007 | 异常⚠️ | — | 登录邮箱或密码传空值 | 401 `{error:"邮箱或密码错误"}` | `POST /api/auth/login` |
| AUTH-008 | 正向✅ | 已登录（含 `token` Cookie） | 调 `GET /api/auth/me` | 200 `{ok:true,user:{id,email}}` | `GET /api/auth/me` |
| AUTH-009 | 正向✅ | 已登录 | 点 NavBar「退出」或调 `POST /api/auth/logout` | Cookie 被清空（maxAge=0）；前端跳转 `/login` | `POST /api/auth/logout` <br> `LogoutButton.tsx` |
| AUTH-010 | 隔离🔒 | 未登录（无/无效/过期 token） | 直接访问 `/dashboard`、`/classes`、`/students`、`/records`、`/generate`、`/settings`、`/api/classes` 等 | middleware 307 重定向到 `/login?redirect=<原路径>`；未登录调用受保护 API 返回 401 `{error:"未登录"}` | `middleware.ts` 全部受保护路由 |

---

## 二、班级管理（Classes）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| CLS-001 | 正向✅ | 已登录 | `POST /api/classes` body `{name:"三年级(2)班",grade:3}` | 200 `{ok:true,class:{id,name:"三年级(2)班",grade:3,studentCount:0}}` | `POST /api/classes` |
| CLS-002 | 边界🔲 | — | 班级名长度 = 0 / 1 / 30 / 31 | 0：400 名称不能为空；1/30：成功；31：400「不能超过 30 个字符」 | `POST /api/classes` |
| CLS-003 | 边界🔲 | — | grade = 0 / 1 / 6 / 7 | 0：400 年级必须 1-6；1/6：成功；7：400 | `POST /api/classes` |
| CLS-004 | 正向✅ | 已登录，存在班级 id=C1 | `GET /api/classes` | 返回数组仅含当前用户的班级；每项含 `id/name/grade/studentCount/created_at`，长度≥1，studentCount 正确等于实际学生数 | `GET /api/classes` <br> `src/app/(app)/classes/page.tsx` |
| CLS-005 | 正向✅ | 已登录，存在班级 id=C1 | `PUT /api/classes/C1` body `{name:"新名",grade:2}` | 200 `{ok:true}`；重新 GET 显示新值 | `PUT /api/classes/[id]` |
| CLS-006 | 异常⚠️ | 班级 id=C1 属于用户 A，用用户 B 登录 | `PUT /api/classes/C1` 或 `DELETE /api/classes/C1` | 404 `{error:"班级不存在或无权限操作"}`（🔒 隔离） | `PUT/DELETE /api/classes/[id]` |
| CLS-007 | 正向✅ | 删除前班级 C1 含学生 S1/S2，学生有记录 R1 | UI 点击「删除班级」→ 弹窗确认 → 点「确定删除」 | 1. 弹窗前有「⚠ 删除班级后不可恢复」警示 + 「取消」「确定删除」双按钮 <br> 2. 成功后 Toast 提示「班级已删除」<br> 3. DB 级联：C1 所在行 + S1/S2 行被删；R1.student_id → null（或按 schema 级联删除） | `DELETE /api/classes/[id]` <br> `classes/page.tsx` Modal |
| CLS-008 | 正向✅ | 已登录 | 连续创建 2 个不同班级 | GET /classes 返回 2 条，互不干扰（支持多班级） | `GET/POST /api/classes` |

---

## 三、学生管理（Students）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| STU-001 | 正向✅ | 已创建班级 C1（grade=3） | `POST /api/students` body `{class_id:C1,name:"张三",gender:"男",tags:"调皮好动,作业拖拉"}` | 200 `{ok:true,student:{id,class_id,name:"张三",gender:"男",tags:"调皮好动,作业拖拉"}}` | `POST /api/students` |
| STU-002 | 边界🔲 | — | name 长度 = 0 / 1 / 20 / 21 | 0：400 不能为空；1/20：成功；21：400「不超过 20 个字符」 | `POST /api/students` |
| STU-003 | 异常⚠️ | — | gender 传 "不男不女" / "M" / "" / null / undefined | 非空非法值：400「性别只能是「男」或「女」或留空」；空/null/未传：gender 存 NULL，不报错 | `POST/PU T /api/students` |
| STU-004 | 正向✅ | 存在学生 S1 | `GET /api/students?classId=C1` | 返回该班级下所有学生（含 gender/tags/class_id） | `GET /api/students` <br> `classes/[classId]/students/page.tsx` |
| STU-005 | 正向✅ | 存在学生 S1 | `PUT /api/students/S1` body `{name:"张小三",gender:"女",tags:"",class_id:C2}`（C2 属于同一用户） | 200 `{ok:true}`；GET 详情显示新班级/性别 | `PUT /api/students/[id]` |
| STU-006 | 隔离🔒 | S1 属于用户 A，B 登录 | `GET/PUT/DELETE /api/students/S1` | GET：404「学生不存在或无权限查看」；PUT/DELETE：404「学生不存在或无权限操作」 | `/api/students/[id]` |
| STU-007 | 正向✅ | — | UI 删除学生流程：点「删除」→ 弹窗 → 确认 | 弹窗文案「⚠ 删除学生信息」+「沟通记录保留但不再关联」+「取消/确定删除」双按钮；操作后 Toast 成功提示 | `classes/[classId]/students/page.tsx` 删除 Modal |
| STU-008 | 正向✅ | — | `POST /api/students/batch-import` body `{class_id:C1,text:"张三,男,内向;成绩下滑\n李四,女,\n,,空名跳过\n  \n王五,,调皮;作业"}` | `{ok:true,successCount:3,skipCount:2,skippedRows:[{lineIndex:3,reason:"姓名缺失"},{lineIndex:4,reason:"空行已跳过"}]}`；王五 gender 存 NULL；标签按逗号入库（`调皮好动,作业拖拉`） | `POST /api/students/batch-import` <br> 批量导入 Modal |
| STU-009 | 边界🔲 | — | 导入文本全空 / 只换行 / 全部跳过行 | successCount = 0；Toast 提示「未导入任何数据」 | 批量导入 Modal |
| STU-010 | 正向✅ | 学生 S1 有 2 条记录 | 访问 `/classes/C1/students/S1` | 展示基本信息 + 标签胶囊 + 所属班级链接 + 历史沟通记录列表（最多 50 条，时间倒序），点击可跳记录详情 | `classes/[classId]/students/[studentId]/page.tsx` <br> `GET /api/students/[id]` |

---

## 四、沟通记录（Records）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| REC-001 | 正向✅ | 班级 C1、学生 S1（C1 下）已存在 | `POST /api/records/create` body `{studentId:S1,parentMessage:"老师，孩子最近…",reply:"话术1---话术2",strategy:"三步走",risks:"- 情绪\n- 敏感",result:"约定周三"}` | 200 `{ok:true, id:<newId>}`；新记录字段完整回填 | `POST /api/records/create` |
| REC-002 | 正向✅ | — | `POST /api/records/create` **不传 studentId**（仅家长消息 + reply） | 200 成功；列表页 student_name 显示「未关联学生」胶囊 | `POST /api/records/create` <br> `records/page.tsx` 卡片 |
| REC-003 | 异常⚠️ | — | parentMessage 空字符串 / 纯空白 | 400 `{error:"家长消息不能为空"}` | `POST /api/records/create` |
| REC-004 | 正向✅ | — | `GET /api/records` 、`?classId=C1`、`?studentId=S1` 三种方式 | 返回 records 数组合法；每条 `{id,student_id,student_name,parent_message_summary(≤30字+…),created_at}`；classId 过滤必须匹配 C1 学生 | `GET /api/records` <br> `records/page.tsx` 筛选 |
| REC-005 | 正向✅ | 记录 R1 存在 | `GET /api/records/R1` | 200 `{ok:true,record:{全部字段}}`；详情页按 Section 分区展示（关联学生 / 家长原文 / 回复 / 策略 / 风险 / 结果） | `GET /api/records/[id]` <br> `records/[id]/page.tsx` |
| REC-006 | 正向✅ | R1 存在，当前 result = null | 详情页 `沟通结果` 文本框输入 → 点「保存结果」 | `PATCH /api/records/R1` 200 `{ok:true}`；Toast「沟通结果已保存」；文本框右上角显示「有未保存的修改」提示 | `PATCH /api/records/[id]` <br> 结果 Section |
| REC-007 | 隔离🔒 | R1 属用户 A，用户 B 登录 | `GET/PATCH /api/records/R1` | 404「记录不存在或无权限查看/操作」 | `/api/records/[id]` |

---

## 五、AI 话术生成（Generate）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| GEN-001 | 正向✅ | DEEPSEEK_API_KEY 已配置、网络可达 | 打开 `/generate` → 粘贴家长消息 → 点「✨ 生成话术」 | 30s 内返回 1-3 条 scripts 数组（非空）、strategy 字符串、risks 数组；页面以卡片展示，每条可复制「📋 复制文案」 | `POST /api/generate` <br> `generate/page.tsx` |
| GEN-002 | 正向✅ | — | 先选班级 → 选学生 → 生成话术 | 请求体 `{parentMessage, studentId}`；系统提示词注入「学生姓名/性别/标签/班级」（可在后端日志确认 assembleSystemPrompt 返回上下文段落） | `POST /api/generate` ↔ `deepseek.ts:assembleSystemPrompt` |
| GEN-003 | 异常⚠️ | — | parentMessage 空 / 5001 字符 | 400 「家长消息不能为空」 / 「不能超过 5000 字符」 | `POST /api/generate` |
| GEN-004 | 异常⚠️ | DEEPSEEK_API_KEY 空值或失效 | 触发 generate | 后端抛错：`DEEPSEEK_API_KEY 未配置` / `DeepSeek API 请求失败（401/403）`；前端 Toast「生成话术失败」+ 描述 | `lib/deepseek.ts` + `generate/page.tsx` |
| GEN-005 | 异常⚠️（降级） | 模拟返回非 JSON（如普通文本） | parseRawJson 返回 null | generate route 走降级：`{scripts:[rawText],strategy:"（解析失败…）",risks:["解析异常，建议人工审查"]}`；前端话术 1 显示「· 建议人工审查」标记 | `deepseek.ts:parseRawJson → fallback` |
| GEN-006 | 异常⚠️（超时） | — | 60s 未返回 | 抛 `生成超时，请稍后重试`；前端 Toast 错误 | `deepseek.ts` AbortController 60_000ms |
| GEN-007 | 正向✅ | — | 话术编辑 textarea 修改内容 → 点「💾 保存为沟通记录」→ 弹窗 + （可选填后续进展）+ 「保存」 | `POST /api/records/create` 发送 `parentMessage + reply(话术join) + strategy + risks + (可选 result + studentId)`；200 后 Toast「已保存为沟通记录」并出现 `查看记录 → /records/{id}` 链接 | generate 保存 Modal |
| GEN-008 | 正向✅（快捷键） | 焦点在家长消息 textarea | 按 `Ctrl+Enter`（Windows/Linux）或 `⌘+Enter`（macOS） | 直接触发生成，无需按钮点击；加载中再按不重复触发（generating 防重入） | `generate/page.tsx` textarea onKeyDown |
| GEN-009 | 正向✅ | — | 点击「复制话术 N」 | 剪贴板内容等于该 textarea 值；Toast「已复制话术 N」，按钮文本短暂切换为 ✓ 已复制 ~1.4s | generate 复制按钮 `handleCopy` |
| GEN-010 | 正向✅（话术库系统提示词注入） | — | 在后端 `buildSystemPrompt()` | 覆盖 20 个场景（清单要求），每个有「家长常见表述 / 回复模板 / 沟通策略 / 风险提示」；包含占位符 `{学生姓名}`、`{具体行为}`、`{家长称呼}` | `lib/scriptLibrary.ts` + `deepseek.ts: assembleSystemPrompt` |

---

## 六、工作台与页面清单

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| DASH-001 | 正向✅ | 有 C 个班级、S 名学生、R 条记录 | 打开 `/dashboard` | 1. 数据概览：班级数量=C、学生总数=S（各自可点击跳转到相应页）<br>2. 快捷入口「生成话术」<br>3. 最近沟通记录 ≤5 条（时间智能显示今天 HH:mm / 其他 MM-DD）<br>4. 顶部显示「每日励志语」<br>5. 空白态有骨架屏 Skeleton（3 张卡片 + 5 条记录骨架） | `GET /api/overview` <br> `dashboard/page.tsx` |
| DASH-002 | 正向✅（空态） | 新账号无任何数据 | 打开 dashboard / classes / records / students / generate 各列表/内容区 | 所有空状态均：SVG 插图图标 + 标题 + 描述 + 主按钮 CTA（如「立即生成」「去新建班级」），视觉一致 | 全部页面 EmptyState |
| RECLIST-001 | 正向✅（筛选） | 多条记录分散在 2 个班级+若干学生 | `records` 页 班级筛选 → 学生筛选动态联动（随 records 重算）| 班级变化时 学生筛选自动清空回到「全部」；筛选结果正确；提供「重置筛选」 | `records/page.tsx` 筛选区 |
| NAV-001 | 正向✅ | 已登录 | 观察 NavBar | 1. Logo / 产品名 <br> 2. 链接：工作台/班级管理/学生管理/沟通记录/话术生成/设置，激活态正确高亮 <br> 3. 主题切换器 sm 尺寸 <br> 4. 用户头像下拉：邮箱展示 + 设置 + LogoutButton <br> 5. `/classes/xxx` 下 NavBar「学生管理」激活 `pathname.startsWith` 正确 | `components/NavBar.tsx` |
| SETT-001 | 正向✅ | — | `/settings` 主题切换器：默认浅色 / 护眼绿 / 暗色循环切换 + 刷新后不变 | localStorage 持久化 key=`theme`；所有 CSS 变量立即切换；文字「在默认、护眼与暗色三套主题之间切换」 | `ThemeProvider/ThemeSwitcher` + `settings/page.tsx` |

---

## 七、主题与微动效 / 励志正能量

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| UI-001 | 兼容性🖥️ | — | 主题 ≥3 套（默认浅色/护眼/暗色）| 均可用；切换无页面闪烁（ThemeProvider 用 suppressHydrationWarning） | `ThemeProvider.tsx` |
| UI-002 | 正向✅ | — | 进入任何登录后页面（classes/students/records 等） | 页面整体淡入（PageTransition opacity 0→1）；列表项 stagger 错位淡入（间隔≈50ms）；卡片 hover 轻微上浮（-translate-y 0.5~4px + shadow-md） | `PageTransition / ListStagger / ClassCard / RecordCard` 等 |
| UI-003 | 正向✅ | — | 所有 MotionButton 点击 | whileTap scale ≈0.96 spring；禁用态 disabled 不触发 whileTap/whileHover | `MotionButton.tsx` & `motion.tsx` |
| UI-004 | 正向✅（生成结果动画） | — | generate 页面生成完成 | 结果区 `AnimatePresence` 切换：加载骨架→占位→结果淡入上滑（opacity + y=10）；生成期间话术区显示 `ResultSkeleton` 5 行骨架 | `generate/page.tsx` |
| QOTD-001 | 正向✅ | — | dashboard、generate 页面顶部 | 每次刷新从 quotes 池随机显示 1 条「每日励志语」；含隐私提示 Notice（话术生成页/学生页显示未成年人数据隐私提示） | `QuoteOfDay.tsx` / `PrivacyNotice.tsx` |

---

## 八、非功能需求（含数据隔离 🔒 总览）

| ID | 分类 | 前置条件 | 步骤 | 预期结果 | 对应接口/页面 |
|---|---|---|---|---|---|
| NF-001 | 隔离🔒 | 建 A/B 两账号，A 建班 C_A，B 建班 C_B | 互相用 API 尝试 GET/PUT/DELETE 对方的 /classes/[id] / /students/[id] / /records/[id] | 全返回 404；数据库查询均带 `user_id=?` 占位（可在 scopedQuery 警告观察） | 全部 route handlers |
| NF-002 | 隔离🔒 | A 账号学生记录 id=SA1，B 账号登录前端 | 直接访问 `/classes/C_A/students/SA1` 和 `/records/RA1`（A的记录） | 前端 API 调用返回 404 → 显示 `NotFoundState` 或 `ErrorBlock`，不泄露数据 | 学生详情 / 记录详情页 404 Block |
| NF-003 | 正向✅（隐私提示） | — | 学生管理页（`/students` + `/classes/:classId/students`）/ 话术生成页 | 显示「未成年人信息仅供家校沟通使用，请严格遵守个人信息保护相关法律法规」隐私提示 banner（文案按任务要求） | `PrivacyNotice.tsx` |
| NF-004 | 正向✅ | — | DB 模式：dev 读取 `MYSQL_URL` 直连 mysql2 / production `process.env.HYPERDRIVE` | 两种路径都可（通过 `lib/db.ts` 条件分支） | `lib/db.ts` |
| NF-005 | 正向✅ | — | `src/db/schema.sql` 检查 | 含：外键 ON DELETE CASCADE（classes→students、classes→records 级联；students→records 按 schema 要求 SET NULL 也行）、`users.email` UNIQUE、所有业务表 `user_id` INDEX | `db/schema.sql` |
| NF-006 | 边界🔲（防枚举） | — | 登录页 错误密码 vs 不存在邮箱 vs 正确密码错误 | 返回文案完全一致 `邮箱或密码错误`，状态码同为 401；响应时间差异 <100ms（bcrypt.compare 必须在「邮箱不存在」分支也执行近似时间） | `POST /api/auth/login` |
| NF-007 | 边界🔲（参数） | — | 所有 API 的 `id` / `classId` / `studentId` 参数：负数、0、字符串、`NaN` 文本 | 解析为无效（parseIdParam/parseIntParam 返回 null）并返回 400「无效的 XX ID」或 404 归属校验失败；绝不执行 `DELETE FROM x WHERE id=0` 等危险语句 | 所有 `[id]/[classId]/[studentId]` route handlers |

---

## 九、最小闭环验收（最小业务路径端到端）

> 对应 checklist.md「最小闭环验收」全部步骤。

| ID | 分类 | 步骤 | 预期结果 |
|---|---|---|---|
| CLOSED-001 | 正向✅ | 老师注册新账号 → 登录 | 成功进 dashboard |
| CLOSED-002 | 正向✅ | 创建班级「3(2)班」→ 手动添加 3 名学生（姓名/性别/标签：调皮/成绩/请假） | classes + students 列表可见，studentCount=3 |
| CLOSED-003 | 正向✅ | 或使用 batch-import 批量导入：`姓名,性别,标签1;标签2` x 3 | successCount≥3，skipCount 报告跳过详情 |
| CLOSED-004 | 正向✅ | 进入「话术生成」：选班→选学生→粘贴家长消息（如：「老师我家孩子说在学校被欺负了请给个说法」）→ 生成 | 30s 内 1-3 条话术 + 策略 + 风险；可选「编辑话术」→ 保存，选保存 Modal 填后续进展 → 确认保存 |
| CLOSED-005 | 正向✅ | 保存成功后点击 `/records/{id}` 查看详情，同时回到学生详情页 | 记录详情字段齐全；学生档案「历史沟通记录」出现该条（说明关联生效） |
| CLOSED-006 | 正向✅ | 切换到另一个新建班级 C2 → 看 C2 学生列表 | 为空态（说明与 C1 数据隔离）|

---

## 十、兼容性测试（桌面/断点/刷新）

| ID | 分类 | 步骤 | 预期结果 |
|---|---|---|---|
| COMP-001 | 兼容性🖥️ | Chrome/Edge/Firefox/Safari 最新桌面版访问全部页面 | 无布局错乱；交互（生成/筛选/删除确认）一致 |
| COMP-002 | 兼容性🖥️ | 宽度断点 1280 / 1024 / 768 | Dashboard 3 列→2 列→1 列自适应；generate 2 列→1 列；NavBar 水平滚动（nav-scroll）不漏 |
| COMP-003 | 兼容性🖥️ | 设置页切暗色 → 关闭浏览器 → 再打开 `/dashboard` | 主题仍为暗色（localStorage 持久化，`ThemeProvider` 启动即读取） |
| COMP-004 | 兼容性🖥️ | 全页面滚动 + 按钮连续快速点击 20+ 次 | 无 JS 报错（控制台 clean）；按钮 loading 禁用防抖；toast 堆叠正常不超过 1 个 |

---

## 附注

- 所有测试用例均要求 **不清库**（`--no-clean` 默认），测试账号使用时间戳后缀邮箱如 `e2e-{ts}@example.com`，班级/学生名使用 `e2e-` 前缀便于后续人工清理。
- 对应自动化脚本见 `scripts/test-all.mjs`（HTTP 模式 + 纯 DB 模式双模式），缺陷清单见 `tests/defect-log.md`。
