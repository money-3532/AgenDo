# AgenDo Front 文件职责说明

> 工程：`c:\Users\ZhuanZ\Desktop\AgenDo\frontend\AgenDo-front`
> 技术栈：Vue 3（`<script setup>`）+ Vite + Pinia + vue-router，纯 JavaScript / CSS，数据全部来自本地 mock，无后端。
> 本文覆盖 `src` 下全部文件，以及与工程结构相关的根目录配置。

---

## 0. 先看这五条主线

1. **路由与页面**：`src/router/index.js` 只有 5 条路由；`CalendarView / TodosView / NotesView` 三个页面各自在内部套一层 `AppLayout`，登录页独立。也就是说 `AppLayout` 不是路由级布局，而是可复用的工作区外壳。
2. **Pinia 分工**：`calendar` 管日程/月历/抽屉/悬浮预览/侧栏宽度；`workspace` 管笔记、待办、清单、标签与侧栏摘要；`ai` 管助手消息、待确认任务与 AI 工作台。页面与外壳通过这三个 store 共享状态。
3. **api 与 mock**：`src/api/index.js` 是唯一取数入口，内部从 `src/api/mock/agendo.js` 取静态数据，并用 `delay()` 模拟异步。**接后端时主要改 `api/index.js`，mock 文件整体替换/删除。**
4. **样式与设计稿**：`src/styles/variables.css` 是从 Ardot 设计稿抽出的全部设计令牌（颜色、字号、间距、圆角、阴影、组件尺寸）；`base.css` 只做重置与全局排版。改视觉优先改变量，不要在各组件里散落硬编码。
5. **公共组件**：`ui/AppModal`（弹窗基座）、`ui/AppIcon`（图标注册表）、`ui/TooltipText`（截断提示）、`panel/*`（抽屉与悬浮预览）承担全站复用；改交互优先看这里。

---

## 1. 根目录与工程配置

- `package.json` — 工程清单与脚本：`dev / build / preview / test:unit / test:e2e / lint / format`；改启动命令、依赖或 Node 版本要求时改这里。
- `vite.config.js` — Vite 配置：启用 Vue / JSX / Vue DevTools 插件，并定义 `@ -> ./src` 别名；新增构建插件或代理后端时改这里。
- `vitest.config.js` — 单元测试配置：复用 Vite 配置，环境 `jsdom`，排除 `e2e/**`；跑 `src/__tests__` 下的用例。
- `playwright.config.js` — 端到端测试配置：`testDir: ./e2e`，本地 baseURL `http://localhost:5173`，自动拉起 dev server，配置了 Chromium / Firefox / WebKit 三个项目。
- `jsconfig.json` — 仅声明 `@/* -> ./src/*` 路径映射，供编辑器跳转与提示；不参与构建。
- `index.html` — 单页入口，提供 `#app` 挂载点；改站点标题、字体或首屏加载资源时改这里。
- `eslint.config.js` — ESLint 扁平配置入口，组合 Vue、Playwright、Prettier 等规则；调整代码规范时改这里。
- `.oxlintrc.json` / `.prettierrc.json` — oxlint 与 Prettier 的规则/格式配置，配合 `npm run lint`、`npm run format` 使用。
- `README.md` — Vue 官方脚手架模板说明，未改写为 AgenDo 项目文档；可忽略或后续重写。
- `e2e/vue.spec.js` — Playwright 脚手架示例用例，未覆盖 AgenDo 业务；写真实 E2E 时替换或新增。

---

## 2. `src` 根文件

- `src/main.js` — 应用入口：创建 Vue app，注册 Pinia 与 router，引入全局样式后挂载到 `#app`。
- `src/App.vue` — 根组件，只渲染 `<router-view />`，不承载任何布局或业务。

---

## 3. `src/router` — 路由表

- `src/router/index.js` — 定义 `/`（日历）、`/todos`（待办中心）、`/notes` 与 `/notes/:id`（备忘笔记）、`/login`（登录），其余路径重定向到 `/`；改页面路径或加路由守卫时改这里。当前没有鉴权守卫。

---

## 4. `src/views` — 四个页面级视图

- `src/views/CalendarView.vue` — 日历主页：在 `AppLayout` 内组合工具栏、筛选、概览、月/周/日/清单视图与底部图例；挂载时调用 `calendar.load()`，是日历相关交互的总编排。
- `src/views/TodosView.vue` — 待办中心：单卡 + 今天/本周/全部分段 + 日期分组 + 右栏进度；数据从 workspace / calendar 派生，改待办页结构或统计口径时看这里。
- `src/views/NotesView.vue` — 备忘笔记页：读取 `/notes/:id`，在 `AppLayout` 内渲染 `NoteEditor`；处理笔记切换与加载。
- `src/views/LoginView.vue` — 独立登录页（不套 `AppLayout`）：左侧品牌渐变与指标、右侧登录表单与第三方入口；目前是纯前端演示，未接鉴权。

---

## 5. `src/components/layout` — 工作区外壳

> 定位：三栏外壳、侧栏组成、顶栏与账号区；全局浮层也由 `AppLayout` 统一挂载。

- `AppLayout.vue` — 工作区外壳：侧栏 + 顶栏 + 页面插槽；维护侧栏拖拽宽度/隐藏阈值（常量在文件顶部）、侧栏上下文、`EntryDrawer`、`AiTaskDrawer`、悬浮预览、标签/清单/目标待办弹窗与 AI 待确认卡的挂载。改全局布局或浮层装配先看这里。
- `AppSidebar.vue` — 侧栏容器：按顺序组合品牌区、新建入口、导航、上下文列表、主题开关、今日简报与账号区；改侧栏信息层级时改这里。
- `SidebarBrand.vue` — 侧栏顶部品牌区：logo + AgenDo 名称 + 收起按钮；改品牌标识或收起入口时看这里。
- `SidebarNav.vue` — 四项主导航（智能任务工作台 / 我的日程 / 待办中心 / 备忘笔记）及计数；改导航项或高亮规则时改这里。
- `SidebarContextList.vue` — 侧栏上下文列表：笔记页显示「笔记目录 + 标签」，其余页显示待办清单；改侧栏二级列表时改这里。
- `ThemeSwitch.vue` — 浅色/深色切换控件外观；目前仅本地 `ref` 切换选中态，**未真正应用主题**，属待接功能。
- `TodayBriefing.vue` — 「今日简报」卡：下一条日程时间 + 待办完成进度 + 少量待办；用于日历页侧栏，改简报内容时看这里。
- `UserAccount.vue` — 底部账号区：头像、姓名、邮箱与设置入口；接真实用户信息时改这里。
- `WorkspaceTopBar.vue` — 工作区顶栏：页面标题、搜索框、通知/帮助按钮；搜索框目前只有本地状态、未接检索。笔记页会隐藏该顶栏。

---

## 6. `src/components/calendar` — 日历视图组件

> 定位：工具栏、筛选、概览与月/周/清单三种视图，以及格内三类条目（日程 / 待办 / 备忘）。

- `CalendarToolbar.vue` — 日历工具栏：上/下翻页、「今天」、月/周/日/清单切换、「新建」；改导航粒度或视图入口时改这里。
- `FilterBar.vue` — 筛选条：当前标签 chip、类型 chip、包含已完成、清除筛选；周视图下隐藏。
- `OverviewBar.vue` — 概览统计条：日程 / 待办 / 备忘数量与总体进度；改统计展示时看这里（数据来自 `calendar.overview`）。
- `MonthGrid.vue` — 月历网格：星期表头 + 6×7 `DayCell`，把当日条目与详情下发；改月历行列结构时改这里。
- `DayCell.vue` — 单个日期格：日期头、进度条、**固定行高的格内滚动条目区**；负责已作为日程关联明细的待办/备忘去重、格内滚轮隔离。改格子内条目行为时改这里。
- `TimeGridView.vue` — 周/日时间网格：9:00–20:00 时间轴、列头与事件块定位；改周视图时间范围或事件块样式时改这里。
- `ListBoard.vue` — 清单视图：按日期分组列出条目；设计稿未覆盖，沿用现有实现。
- `EventChip.vue` — 月格里的日程条：时间 + 标题，颜色跟随标签；改日程 chip 外观时看这里。
- `TodoItem.vue` — 月格里的待办条：复选框 + 标题 + 完成态删除线；改待办 chip 时看这里。
- `NoteSticker.vue` — 月格里的备忘条：琥珀色贴纸 + 文件图标；改备忘 chip 时看这里。

---

## 7. `src/components/notes` — 笔记编辑器与选择弹窗

> 定位：飞书风格块编辑体验，以及标签/清单/目标待办相关弹窗（弹窗多由 `AppLayout` 挂载）。

- `NoteEditor.vue` — 笔记编辑器：面包屑、自动保存开关、标题与标签、200px 大纲/相关笔记列、块内容、导入待办与版本记录入口；改笔记页主体时看这里。
- `NoteBlock.vue` — 单个内容块渲染：标题、正文、引用、分割线、待办等块的样式与交互；新增笔记块类型时改这里。
- `TagCreateModal.vue` — 新建标签弹窗：340 宽、名称输入（12 字上限）、16 色圆形色卡 2×8；改标签创建规则时看这里。
- `ListPickerModal.vue` — 「导入到待办清单」弹窗：搜索清单、单选清单、确认导入；服务于笔记导入任务。
- `TodoPickerModal.vue` — 「选择目标待办」弹窗：320 宽、按日期分组、多选待办、完成项禁用；服务于抽屉里的关联条目。

---

## 8. `src/components/panel` — 抽屉与悬浮预览

> 定位：右侧详情抽屉、AI 工作台抽屉、条目悬浮预览三类全局浮层。

- `EntryDrawer.vue` — 条目编辑抽屉：标题、类型 chip、完成状态、富文本工具栏、时间规则折叠、标签、关联条目、删除/取消/保存；改条目编辑体验时改这里。
- `AiTaskDrawer.vue` — AI 智能任务工作台抽屉（360 宽）：原始指令、执行计划步骤、变更预览、确认执行与底部输入区；改 AI 任务流程时改这里。
- `EntryHoverPreview.vue` — 条目悬浮预览（196 宽）：按锚点定位，渲染后按实际尺寸收敛到视口内，并监听 resize/scroll 重算；改预览内容或定位时改这里。

---

## 9. `src/components/ai` — AI 浮层

- `AiAssistant.vue` — 右下角 AI 助手浮窗（消息列表、快捷功能菜单、待确认任务）；**当前未被任何页面挂载**，属保留实现，重新启用时在 `AppLayout` 引入即可。
- `AiPendingCard.vue` — 右下角「AI 待确认任务」浮卡（320 宽）：任务行 + 执行/拒绝；由 `AppLayout` 挂载。

---

## 10. `src/components/ui` — 公共 UI 基件

- `AppIcon.vue` — 全站 SVG 图标注册表：所有图标名到路径的 map；新增图标时只改这里，再在业务组件按名引用。
- `AppModal.vue` — 弹窗基座：标题/副标题/宽度/遮罩/ESC 关闭，支持 `bareFooter`；其余弹窗都复用它。
- `TooltipText.vue` — 文本截断提示：仅当真实溢出时在 `body` 下 Teleport 显示完整文本；用于条目 chip 与列表标题。

---

## 11. `src/stores` — Pinia 状态

> 定位：三个业务 store 各管一域，页面与外壳共享；`counter.js` 是脚手架遗留。

- `calendar.js` — 日历域：entries / details / tags / overview、当前日期与视图、筛选、抽屉、悬浮预览、侧栏宽度与隐藏态；提供 `load / shift / goToday / openDraft / openEntry / saveEntry / removeEntry / showHoverPreview` 等。**接后端时与 `api/index.js` 一起改。**
- `workspace.js` — 工作区域：笔记、待办、清单、标签、侧栏摘要；提供 `bootstrap / loadTodos / loadNotes / toggleTodo / createTag / confirmImport` 与笔记块增删改。待办页、笔记页、侧栏都依赖它。**接后端时主要改这里。**
- `ai.js` — AI 域：助手消息、输入草稿、待确认任务、AI 任务抽屉与执行步骤；提供 `bootstrap / send / openTask / confirmPending / runQuickAction`。**接真实 AI 服务时主要改这里。**
- `counter.js` — Vue 脚手架示例 store，当前无任何引用，可删除。

---

## 12. `src/api` — 取数层与 mock

> 定位：组件/store 不直接碰 mock，统一经 `api/index.js`；未来换真实接口时只替换这一层。

- `index.js` — 唯一数据访问门面：导入 mock 数据，用 `delay()` 模拟网络；导出 `getCalendar / getEntry / updateEntry / updateEntryTags / createEntry / deleteEntry / getTodos / toggleTodo / importTasksToList / getNotes / updateNoteBlock / addNoteBlock / deleteNoteBlock / createTag / login / getSidebarSummary` 等。**接后端的第一入口。**
- `mock/agendo.js` — 本地 mock 数据与生成逻辑：用户、日程/待办/备忘条目、详情、标签、清单、笔记块、AI 任务与侧栏摘要，日期按运行当天动态生成；字段结构对齐未来接口。**接后端后整体替换或删除。**

---

## 13. `src/utils` — 纯函数工具

- `date.js` — 日期工具：`TODAY_KEY`、`toDateKey / parseDateKey / addDays`、`formatDateCN / formatDateWithWeekday / formatTime / formatTimeRange`、日分组与相对时间（今天 10:42 / 2小时前）。所有真实日期展示都走它。
- `entries.js` — 条目关系工具：`relatedEntries`（悬浮预览的同日关联明细）、`linkedDetailIds`（月格去重依据）；日历 store 与 `DayCell` 共用，避免算法漂移。
- `tags.js` — 标签样式映射：把标签颜色转成文字色/背景色的 `tagStyle`；月格 chip、筛选条、笔记标签共用。

---

## 14. `src/styles` — 全局样式

- `variables.css` — 设计令牌总表：字体、字号、颜色（品牌/标签/进度/边框/文本）、间距、圆角、阴影、组件尺寸（侧栏、抽屉、悬浮预览等）。**改视觉优先改这里，数值对应 Ardot 设计稿。**
- `base.css` — 全局重置与基础排版：盒模型、字体、滚动条、按钮/输入框基线、页面背景等；不放具体业务样式。

---

## 15. `src/__tests__` — 单元测试

- `date.spec.js` — 日期工具的 Vitest 用例（格式、偏移、相对时间等）；改日期工具后跑 `npm run test:unit` 回归。

---

## 16. 后续接后端时主要改这里

| 优先级 | 文件 | 要做什么 |
| --- | --- | --- |
| 1 | `src/api/index.js` | 把 mock 调用换成真实 HTTP 请求，保留现有函数签名，store 基本不用动 |
| 2 | `src/api/mock/agendo.js` | 删除或仅保留开发环境开关 |
| 3 | `src/stores/calendar.js`、`workspace.js`、`ai.js` | 增加 loading / error / 重试与真实字段映射 |
| 4 | `src/views/LoginView.vue` + `router/index.js` | 接鉴权、token 持久化与路由守卫 |
| 5 | `UserAccount.vue` / `TopBar` 搜索 | 接当前用户与全局检索 |
| 6 | `AiAssistant.vue`、`ai.js` | 接真实 AI 接口后重新挂载助手浮窗 |

## 17. 脚手架遗留 / 当前未生效

- `src/stores/counter.js`：无引用，可删。
- `src/components/ai/AiAssistant.vue`：实现完整但未挂载（AI 浮卡已按设计稿移除）。
- `src/components/layout/ThemeSwitch.vue`：只有选中态，没有真正切换主题。
- `WorkspaceTopBar` 搜索框：仅本地输入，未接筛选。
- `README.md`、`e2e/vue.spec.js`：Vue 脚手架模板，未针对 AgenDo 改写。
