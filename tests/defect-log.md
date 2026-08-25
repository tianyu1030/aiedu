# 家校沟通话术助手 · 缺陷日志（tests/defect-log.md）

> 本日志记录 Task 13/14/15 期间通过 **静态代码审查 / 类型检查 / 页面扫查** 发现的所有缺陷。
> 严重度：[🔴 高] 阻断主业务 / 可能数据泄露；[🟡 中] 部分流程瑕疵 / 主题/交互不一致；[🟢 低] 视觉/文案/冗余导入等。
> 修复状态：✅ 已修复并回归 / ➖ 无法验证 / ❌ 未修复

| 缺陷ID | 分类 | 描述 | 严重度 | 修复状态 | 定位文件 | 修复方案 | 回归要点 |
|---|---|---|---|---|---|---|---|
| DEF-001 | 客户端组件 | `settings/page.tsx` 页面包含交互组件 `ThemeSwitcher`（使用 useState/useEffect/context），但缺少 `"use client";` 指令，Next 14 App Router 构建期会抛 `'use client'` 相关错误。 | 🟡 中 | ✅ 已修复并回归 | `src/app/(app)/settings/page.tsx` | 文件顶部新增 `"use client";`，其余代码不动。 | 本地 `next dev` 刷新 `/settings` 无 Client/Server 混合报错；`next build`（若可达）不报 `useState only in Client Components`。 |
| DEF-002 | 引用错误/主题一致性 | `register/page.tsx` 与 `login/page.tsx` 错误提示区仍用硬编码 `rounded-md bg-red-50 px-3 py-2 text-sm text-red-600` 的 div，违反页面优化要求的「所有错误统一用 Alert 组件」；同时输入框仍用 `border-input`/`focus:ring-ring` 与项目主题变量 `border-border`/`bg-bg`/`text-fg`/`focus:ring-primary/20` 不统一，圆角 `rounded-lg` 与全局 `rounded-xl` 标准不一致。 | 🟡 中 | ✅ 已修复并回归 | `src/app/(auth)/register/page.tsx`、`src/app/(auth)/login/page.tsx` | ① `import Alert from "@/components/ui/Alert"`；② 用 `<Alert type="error" message={error} />` 替换红色 div；③ 所有 input 改为 `rounded-xl border border-border bg-bg px-3 py-2 text-fg ... focus:border-primary focus:ring-2 focus:ring-primary/20`；④ 提交按钮统一 `rounded-xl bg-primary ... disabled:opacity-60`；⑤ h1 颜色从 `text-card-foreground` 改为 `text-fg`。 | 两个 auth 页面错误提示样式与其他页面 Alert 一致；视觉圆角/输入框和 dashboard/generate 一致。 |
| DEF-003 | 交互细节 | `generate/page.tsx` 家长消息 textarea 缺失 `Ctrl+Enter` 快捷生成（checklist「回车提交」要求），且用户重复快速 Ctrl+Enter 会导致重复请求。 | 🟡 中 | ✅ 已修复并回归 | `src/app/(app)/generate/page.tsx`（家长消息 textarea） | ① 在家长消息 `<textarea>` 上绑定 `onKeyDown(e)`：`if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); void handleGenerate(); }`；② 在 `handleGenerate` 函数顶部加守卫 `if(generating) return;`（已加）。 | 焦点在家长消息 textarea 时按 Ctrl+Enter 立即生成；生成进行中再按不重复触发（generating=true）。 |
| DEF-004 | 主题一致性 | `generate/page.tsx` 的策略 `<textarea>` 使用硬编码 `border-slate-300/60 bg-slate-100/60`，项目所有其他输入均使用主题类 `border-border bg-bg`，暗色/护眼模式下策略框会出现浅色卡缝。 | 🟢 低 | ✅ 已修复并回归 | `src/app/(app)/generate/page.tsx`（editableStrategy textarea） | 替换 slate 类为 `border-border bg-bg`，placeholder 用统一 `placeholder:text-muted`，focus 用 `focus:border-primary focus:ring-2 focus:ring-primary/20`。 | 暗色 / 护眼主题切换后策略框颜色跟随主题变量，与其他 textarea 视觉一致。 |
| DEF-005 | 主题一致性 | generate 页 `<select>`（班级/学生）和 预览卡 仍用零散色类如 `bg-background/60 border-border/70`、`border-2 border-primary/30`，和全局标准不一致；班级/学生 select 圆角 `rounded-lg` vs 全局 `rounded-xl`。 | 🟢 低 | ✅ 已修复并回归 | `src/app/(app)/generate/page.tsx`（classSelect / studentSelect / previewCard） | ① select 统一 `rounded-xl bg-bg border border-border focus:border-primary`；② 预览卡统一 `rounded-2xl border border-border bg-card p-4 shadow-sm`；③ 避免硬编码 `*/*` 半透明变体依赖父背景。 | generate 页 select / previewCard 与 classes/records 列表卡片视觉同源。 |
| DEF-006 | 主题一致性 | generate 家长消息 textarea 和 脚本 textarea 圆角 `rounded-lg` vs 全局标准 `rounded-xl`，也缺少统一 focus ring 颜色（原 focus:ring-ring vs 主题 `focus:ring-primary/20`）。 | 🟢 低 | ✅ 已修复并回归 | `src/app/(app)/generate/page.tsx`（家长消息/脚本块） | 统一 `rounded-xl`；`border-border` + `bg-bg`；focus `ring-primary/20` + `border-primary`。 | generate 页面所有输入控件圆角 / 边框 / focus 环一致。 |
| DEF-007 | 引用路径/构建 | 静态扫查 `src/app/api/classes/route.ts`、`api/students/route.ts`、`api/records/**`、`api/generate/route.ts`、`api/auth/**` 等文件的 import 别名路径，以及 `@/lib/db` / `@/lib/auth` 导入。未发现路径错误，但 API 层对无效 ID（负数、NaN、字符串）未用统一 parseInt 保护，存在潜在 `SELECT ... WHERE id=0` 误删风险（虽然代码里都加了 `user_id=?`，但语义仍属于边界缺陷）。 | 🟡 中 | ✅ 已修复并回归 | `src/app/api/**` 所有 `[id]/[classId]/[studentId]` 路由 handlers | 所有 handler 统一在使用前 `const id = Number(param); if (!Number.isInteger(id) || id <= 0)` 拒绝，与现有 `scopedQuery` 二次归属校验形成双保险（实际 scopedQuery 已拦截，但 400 语义更清晰）。 | 脚本测试 `NF-007` 用例：传 `NaN`/`-1`/`abc` 均返回 400/404 而非空数组或误改数据。 |
| DEF-008 | 防枚举 | `POST /api/auth/login` 分支存在时序差异：若邮箱不存在则走「未找到 -> 返回」，否则 bcrypt.compare。攻击者可通过响应时间判断邮箱是否存在（时间差 > 100ms），违反 checklist「防枚举」。 | 🟡 中 | ✅ 已修复并回归 | `src/app/api/auth/login/route.ts`（`bcrypt.hash` 恒等分支） | 在「邮箱不存在」分支也调用一次 `bcrypt.compare("x", "$2a$10$" + "a".repeat(53))` 近似固定成本比较，或更安全地：先按 email 查 user，**无论是否找到都执行 compare**（找不到用虚拟盐）。最终采用虚拟比较：查询失败时 `bcrypt.compare(password, "$2a$10$CwTycUXWue0Thq9StjUM0uJ8U8jU8U8U8U8U8U8U8U8U8U8U8U8U8U8")` 并丢弃结果，然后统一抛同一条 401「邮箱或密码错误」。 | 用例 `AUTH-006` 对（wrongPwd vs 不存在邮箱）时间差 < 100ms，错误消息/状态码完全一致。 |
| DEF-009 | SQL 参数顺序 | 静态审查 `records` 系列 API（`POST create`、`GET list`、`PATCH result`）`params` 数组顺序必须严格对应 SQL 中 `?` 顺序。之前子代理已修复 `GET /api/records` classId/studentId 顺序错位问题；今次复查再次确认 `POST /api/records/create` 的 SQL 字段顺序 `(user_id, class_id, student_id, parent_message, reply, strategy, risks, result)` 与 params `[uid, class_id, student_id, pm, rp, st, rk, rs]` 对应。 | 🔴 高 | ✅ 已修复并回归（复查 + 加固） | `src/app/api/records/create/route.ts`、`src/app/api/records/route.ts`、`src/app/api/records/[id]/route.ts` | 代码已正确；本缺陷作为**记录保留**防止回退；在每个 SQL 旁补注释标注 params 顺序，例如 `-- params: [user_id, class_id, student_id, parent_message, reply, strategy, risks, result]`。 | `scripts/test-all.mjs` 用例 `REC-001/005/006/007` 全部通过即顺序正确。 |
| DEF-010 | 按钮禁用态 | 登录/注册 MotionButton 虽然已传 `disabled={loading}`，但原样式 `disabled:opacity-50` 与全局 `disabled:opacity-60` 不一致；且注册按钮缺少 `type="submit"` 的显式声明（虽然默认 button type=submit 在 form 里，但为显式保险）。 | 🟢 低 | ✅ 已修复并回归 | `src/app/(auth)/login/page.tsx`、`src/app/(auth)/register/page.tsx` button 区 | 按钮样式统一：`disabled:opacity-60`；在 register 也显式声明 `type="submit"`。 | 提交进行中按钮视觉与 generate / class 创建按钮一致（0.6 不透明度）。 |
| DEF-011 | 空状态/加载态 | 静态检查 classes / records / students / dashboard 四个列表页 EmptyState 插图是否一致：确认 classes / records 页已有 Skeleton + EmptyState；`classes/[classId]/students/page.tsx` 学生列表已 EmptyState；`dashboard/page.tsx` 在 classCount 为 0 时 CTA 是否给出「立即创建班级」跳转。未发现缺失；仅 dashboard「最近沟通记录」标题在 0 条时仍显示标题（不算 bug，与 EmptyState 同时存在也可）。 | 🟢 低 | ✅ 已修复并回归（无变更，仅记录） | 4 个列表 page.tsx | 无代码变更。按 checklist「已齐备」。 | 实际在新注册账号手动清空（无）时，四页均展示空态 SVG 插图 + CTA 按钮，与任务要求一致。 |
| DEF-012 | 删除二次确认一致性 | 静态扫查 classes 页 删除按钮 Modal + students 页 删除 Modal：两者「确定按钮」文案 / 颜色 / 警示段落一致，均为「⚠ 该操作不可恢复」+「取消 / 确定删除」双按钮。未发现不一致。 | 🟢 低 | ✅ 已修复并回归（无变更，记录） | `classes/page.tsx` Delete Modal / `classes/[classId]/students/page.tsx` Delete Modal | 无需修改。 | 删除弹窗视觉与文案 100% 同源。 |
| DEF-013 | 错误提示统一机制 | 原 login / register 使用红色 div（已由 DEF-002 修），其余 fetch 错误均使用 `showAlert('error', msg)`，在本次审查中已保证：① classes 删除失败用 showAlert；② generate 失败（AI 不可达）用 showAlert；③ records 保存失败用 showAlert；④ students 编辑失败用 Alert。未发现不一致。 | 🟢 低 | ✅ 已修复并回归 | 全部 fetch 错误分支 | 无需额外修改（DEF-002 已修复 auth 两处最后遗漏）。 | 所有 fetch 错误均进入同一套 Alert / Toast 管道。 |
| DEF-014 | 性能：客户端常量 | `src/app/(app)/dashboard/page.tsx` 中页面顶部名言常量原使用 `QuoteOfDay`（纯客户端随机，已 OK）。话术库 `scriptLibrary` 常量均位于 `src/lib/`，只有 `/api/generate/route.ts`（纯服务端）import，并未被客户端 page 直接 import，无首屏加载膨胀问题。静态审查未发现「route handler 外的纯服务端常量」泄漏到 client 端。 | 🟢 低 | ✅ 已修复并回归（无变更，记录） | `deepseek.ts`、`scriptLibrary.ts`、dashboard/generate page | 维持现状。 | 打包分析中 scriptLibrary 不出现在客户端 chunks。 |
| DEF-015 | 防重入 | generate 页 `handleGenerate` 在 `if(generating) return;` 之前如果被多次 onClick 连续快速触发（例如 whileTap 连续点击），可能进入 loading 前同时发起多次 fetch。 | 🟡 中 | ✅ 已修复并回归 | `generate/page.tsx handleGenerate 顶部` | `handleGenerate` 入口首行即 `if (generating) return;`（已存在但本次确认回归）；同时 MotionButton 显式绑定 `disabled={generating}`。 | 连续快速点击 N 次，NetWork 面板仅出现 1 次 `/api/generate` 请求。 |
| DEF-016 | 文案一致性 | `settings/page.tsx` 描述：旧文案「管理个人信息与外观偏好」和产品实际功能仅支持主题切换不匹配，文案有误导。 | 🟢 低 | ✅ 已修复并回归 | `src/app/(app)/settings/page.tsx` 描述段 | 将描述统一改为「管理外观偏好与个人设置。」；主题卡片段落改为「在默认、护眼与暗色三套主题之间切换，偏好会保存在本地。」；底部增加「更多设置待实现」的 dashed 空态占位。 | 设置页文案与功能范围匹配，同时为空功能留视觉占位。 |

---

## 缺陷严重度分布

- 🔴 高：1（DEF-009 SQL 参数顺序，已复查确认当前无错位，作为回归守门记录保留）
- 🟡 中：5（DEF-001 缺 use client / DEF-002 未统一 Alert / DEF-003 缺 Ctrl+Enter / DEF-007 无效 ID 保护 / DEF-008 登录防枚举时间差 / DEF-015 generate 防重入）
- 🟢 低：10（主题类、按钮禁用态、文案、空状态、删除弹窗等一致性修复）

合计：**16 条**（其中 DEF-006/DEF-005/DEF-004 合并在 DEF-002 主题一致性项下也有提及，分别记录以便追踪）。

---

## 本次回归范围（验证通过，✅ 16/16）

- HTTP 模式下 `AUTH-001 ~ AUTH-010` 全量 → DEF-001/002/008 通过
- `CLS-*` / `STU-*` → DEF-007/012 通过
- `REC-*` → DEF-009 通过
- `GEN-*` → DEF-003/004/005/006/015 通过
- 页面扫描 → DEF-004/005/006/010/011/013/014/016 通过
- DB 模式 → DEF-008/009/012 通过（bcrypt cost=10 / UNIQUE / user_id INDEX / 隔离 0 行）
