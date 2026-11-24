# AgenDO 后端 HTTP 接口文档

**API v1** · **文档 1.1** · **设计中** · **2026-11-24**

适用于首期网页、测试和经授权的调用方。以 《HTTP 契约与关键交互》、《模块公开接口设计》及《治理与提醒设计》为依据。本文件确定联调用的报文设计。当前工作区尚无正式 Controller 可核对，示例待实际环境验证。

## 1. 环境与鉴权

| 环境 | 基础 URL（不含 API 路径） | 负责人 |
|---|---|---|
| 本地开发 | 待确认，以服务启动配置为准 | 后端 |
| 测试联调 | 待确认，测试环境发布后填入 | 部署与测试 |
| 正式环境 | 待确认，使用 HTTPS | 部署 |

API 前缀是 `/api/v1`。示例适用 Bash 或 Git Bash。把 ORIGIN 设为真实基址（结尾无斜杠），把 BASE 设为 `"$ORIGIN/api/v1"`。先运行登录卡，替换测试账号密码，把响应 csrfToken 保存为 CSRF 变量。随后使用 cookies.txt。示例 ID、修订、暂存 ID、指纹须换为实际先决调用返回值；推送使用浏览器真实订阅；时间示例按测试时钟解释。

- 鉴权使用服务端会话 Cookie，通过 Cookie 请求头传递。Cookie 为 HttpOnly、SameSite=Lax，生产环境加 Secure。使用 Spring Boot 内嵌 Servlet 容器默认的会话 Cookie 名 `JSESSIONID`，`curl -b cookies.txt` 自动携带。首期只定义会话鉴权。登录校验同源 Origin，已登录变更通过 `X-CSRF-Token` 校验。普通用户限本人资源，使用可信会话定位用户。
- JSON 成功响应直接返回资源对象；204 无体。上传为 multipart/form-data，文件内容返回字节。ID、revision 与重复实例号均为 JSON 字符串。Date 用 YYYY-MM-DD；Time 用 HH:mm[:ss]；Instant 含时区偏移。业务日按 UTC+8，范围左闭右开。分页为 {items, nextCursor}，游标只能用于原查询。
- PATCH 省略即保持，显式 null 仅用于可清空字段。覆盖写入时用资源最新 revision。覆盖写入在同一事务内按所有者锁序复核归属、状态及 revision。实际变更才推进修订。重复日程先锁固定系列锚点，再重读分段、例外与删除范围。文件独立保存、带新增上传的复合保存及创建 Agent 计划按卡片传 Idempotency-Key。相同意图使用原键及原参数。Agent 确认与执行按计划版本、指纹和内部凭据去重。
- 仅日期截止从次日 00:00 起逾期。精确截止在当前时刻严格晚于所填截止时刻时才逾期，两者相等时尚未逾期。无截止不产生逾期。提醒启用、暂停和关闭与完成状态独立。待办按资格在截止日 17:00 和次日 09:00 提醒，每个截止周期各至多一次。精确截止到点无独立提醒。全天日程提醒方案 B 默认 NONE，开启后可选当天或前一天某一时刻，过期不补发。日历待办截止标志由待办列表数据叠加展示。

<a id="validation-types"></a>
### 1.1 通用字段类型与校验

前端可提前提示，服务端始终完整校验。请求为 UTF-8。文本长度按 Unicode 码点计数，允许中文和 emoji，账号、协议标识和令牌按其独立规则。普通单行文本默认去首尾普通空格 U+0020，拒绝 ASCII 控制字符；多行文本保留换行及制表符，拒绝其余 ASCII 控制字符。可空文本使用 null 清除，空串不能代替 null；正文内文字等明确允许空串的字段除外。密码、游标、令牌及各类标识按原值校验，不裁剪、不转换大小写。字符串不接受无效 Unicode 代理项。必填表示必须出现且非 null，条件必填由详情卡或下方分支定义决定。PATCH 先合并旧值再验证完整状态，至少提供一个可编辑业务字段。

| 类型 | 精确约束 |
|---|---|
| PosID / revision | JSON 字符串或路径/查询字符串，匹配 `^[1-9][0-9]{0,19}$`，数值不超过 18446744073709551615。无前导零，不以 JavaScript Number 读取。revision 必须与目标最新修订一致，过时返回 409 REVISION_CONFLICT。 |
| UUID | 小写规范 UUID 文本，36 ASCII 字符，匹配 `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`，禁止全零。客户端生成的幂等键还需为 UUID v4。 |
| RecycleID | 普通对象及资产回收项用 PosID；CALENDAR_SERIES 使用服务端返回的稳定 UUID 删除记录 ID。不得用普通实体 ID 代替系列回收项。 |
| UInt32 | JSON 整数，1–4294967295，无小数和单位。若字段定义为字符串，传同范围的规范十进制字符串。 |
| Date | 严格 YYYY-MM-DD，真实公历日期，年份 1000–9999，按 UTC+8 解释；须能计算关联提醒时点。 |
| Time | HH:mm 或 HH:mm:ss，24 小时制；00:00:00–23:59:59，秒省略取 00，不接收偏移、24:00 或闰秒。和 Date 合成 UTC+8 业务时间。 |
| Instant | ISO 8601 绝对时间，必须含 `Z` 或 `±HH:mm`，秒必填，小数秒 0–3 位；有效时区偏移最大 ±14:00。比较前按同一绝对时间归一，持久化至 UTC 毫秒。 |
| boolean | JSON 只接受 true/false；Query 用小写 `true` 或 `false`。不接受 0/1、空串或 null。 |
| cursor | 服务端返回的不透明字符串，1–2048 个可见 ASCII 字符（0x21–0x7E），Query 时 URL 编码。绑定用户、列表、过滤和排序；改变条件后舍弃游标。无效返回 400。 |
| Enum | 大小写敏感，必须是对应字段列明的值。除明确列出的 JSON nullable 字段外，不接受 null。 |
| 引用 | 服务端先检查格式，再核对存在、归属和生命周期。不存在或不可访问返回 404；本人对象存在但状态不允许时返回 409 STATE_CONFLICT。仅文件仍有有效引用而尝试删除返回 409 ASSET_IN_USE。 |
| SHA-256 指纹 | 64 个小写十六进制 ASCII 字符，匹配 `^[0-9a-f]{64}$`。来自预览，原样回传。与计划/批次不一致返回 409。 |

查询日期区间左闭右开，同时提供两端时下界必须早于上界。日历实例查询两端均必填，最多 93 个自然日。截止日和历史日程允许在过去；历史提醒时点不补发。服务端在超过有效业务时间域或未来时点换算不合法时拒绝对应字段。

<a id="validation-headers"></a>
### 1.2 请求头

| 头 | 使用条件 | 格式与校验 |
|---|---|---|
| Origin | 登录必填；其他请求若携带也须为允许的同源来源 | 单个 http/https 源，最多 255 个 ASCII 字符；仅协议、主机及可选端口，比对部署允许的 scheme/host/port。拒绝 null 源、路径、查询、片段和凭证。错误来源返回 403 FORBIDDEN。 |
| Cookie | 登录之外，所有会话接口 | 通过 HTTP Cookie 携带 JSESSIONID，例如 `Cookie: JSESSIONID=example-session-id`。实际请求使用服务器签发的值。过期或无效返回 401。 |
| X-CSRF-Token | 已登录的 POST、PUT、PATCH、DELETE；登录使用 Origin 规则 | Base64url 无补位，32 随机字节编码为 43 个字符，字符集 `[A-Za-z0-9_-]`；用会话响应中的值，绑定当前会话。缺失、非规范编码或不匹配返回 403 CSRF_INVALID。 |
| Idempotency-Key | 保存文件、创建 Agent 计划必填；创建待办/日程且 newAssets 非空时必填 | 小写 UUID v4，36 ASCII 字符，需匹配 `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`。作用域为账号 + HTTP 操作。以规范化业务参数比较。同键同参已提交时返回原结果，同键异参返回 409 IDEMPOTENCY_CONFLICT，同键处理中返回 409 RESULT_PENDING。终态后重放期 24 小时；在途或未核实状态必须继续保护。超过重放期勿直接提交旧意图，应先查询资源或原操作。Agent 已确认步骤的业务凭据遵循治理契约的独立生命周期。 |
| Content-Type | 有 JSON 或文件 Body 时必填 | JSON 为 application/json，允许 charset=UTF-8；上传为 multipart/form-data 并有有效 boundary。类型缺失或不符返回 415 UNSUPPORTED_MEDIA_TYPE，支持类型下 JSON 或 multipart 格式损坏返回 400 INVALID_REQUEST。无 Body 请求无需此头。本表的 415 UNSUPPORTED_MEDIA_TYPE 适用于所有带请求体的接口，包括详情卡未逐项列出的接口。 |

以下重放规则适用于携带 Idempotency-Key 的请求。请求超时或收到 409 RESULT_PENDING 且尚未获得结果 ID 时，用同一幂等键和原参数重放。首次等待 1 秒，随后等待 2 秒，再以 3 秒间隔退避重放。本轮从首次发现超时或待核实起最多等待 30 秒，累计达到上限后停止自动重放并显示待核实，用户可在重放期内用原键原参继续。收到成功、确定失败或 IDEMPOTENCY_CONFLICT 即停止自动重放。收到会话失效时暂停，重新登录同一账号后方可继续；超过重放期先核对已有业务结果。

令牌编码与人工 HTTP 幂等重放期为本轮新增的接口设计值，待后端联调验证。在发布前核对重复请求、明确回滚和等待核实三种情形的实现行为。

<a id="validation-order"></a>
### 1.3 列表、范围与排序

limit 为十进制整数 Query，1–100 条，默认 25。仅接受下列固定排序，接口没有 sort 或 direction 入参；传入未知参数返回 400。各列表尾部使用唯一键打破同值并列。

| 接口 | 排序字段 | 方向 |
|---|---|---|
| API-04 待办 | 是否有截止、截止业务日和时刻、ID | 有截止在前，截止及 ID 升序；日期型于该日末尾比较 |
| API-18 日程 | 实际业务日期、全天标识、实际开始时刻、稳定身份 | 日期、时刻、身份升序，同日全天在定时前 |
| API-23 备忘录 | 更新时间、ID | 降序 |
| API-27 / 34 持久文件、资料库 | 上传时间、ID | 降序 |
| API-33 / 35 引用、关系 | 按类型、该类型记录稳定键 | 升序 |
| API-38 搜索 | 同实体列表顺序 | 同待办、日程、备忘录列表 |
| API-39 回收箱 | 删除时点、回收项 ID | 降序 |
| API-52 通知 | 创建时点、ID | 降序 |

## 2. 错误码

首期同源网页以 401 JSON 识别会话失效。AUTH_REQUIRED 时重新登录并更新 CSRF，写操作按各接口的重放规则处理；登录凭证无效返回 AUTH_INVALID。会话认证只使用 JSESSIONID，两个 401 均不发送 WWW-Authenticate。该行为是本项目对 RFC 9110 §15.5.2 的明确取舍。

错误体为 {code, message, requestId, fieldErrors?, revision?, details?}。fieldErrors 每项为 {field,code,message}，版本冲突可带当前 revision，文件引用冲突可带 referenceCount 和 referencesUrl。排查时记录 requestId，保护 Cookie 与推送凭证。

| HTTP | 业务码 | 触发条件 | 处理 |
|---|---|---|---|
| 400 | INVALID_REQUEST | 请求类型、字段或游标错误 | 按参数表修正；游标错误时从第一页重试 |
| 401 | AUTH_INVALID | 账号或密码错误 | 核对凭证后登录 |
| 401 | AUTH_REQUIRED | 会话缺失或已过期 | 重新登录并更新 CSRF |
| 403 | CSRF_INVALID | 写请求校验值不匹配 | 从当前会话重新读取 CSRF |
| 403 | FORBIDDEN | 缺少入口权限 | 改用有权的账号及入口 |
| 404 | RESOURCE_NOT_FOUND | 目标不存在、已不可访问或不属于当前用户 | 刷新列表和核对对象 ID |
| 409 | REVISION_CONFLICT | 提交修订已过时 | 重读资源、合并草稿后提交 |
| 409 | STATE_CONFLICT | 当前生命周期不允许操作 | 刷新对象状态 |
| 409 | ASSET_IN_USE | 文件仍被事项关系或正文引用 | 查询引用，按需解除后再试 |
| 409 | UPLOAD_EXPIRED | 暂存文件过期或已失效 | 先核对原保存结果，必要时重新上传 |
| 409 | IDEMPOTENCY_CONFLICT | 同一键携带不同参数 | 原样重放；新意图才换键 |
| 409 | PLAN_CHANGED | 确认版本、指纹或前置条件已变化 | 重新预览并由用户确认 |
| 409 | RESULT_PENDING | 仍有在途或未知结果 | 轮询原操作 ID，勿盲重试 |
| 409 | UNDO_CONFLICT | 撤销资格或保护条件变化 | 重新预览可撤销范围 |
| 413 | INPUT_TOO_LARGE | 输入超过容量上限 | 按输入边界缩小文件或文本 |
| 415 | UNSUPPORTED_MEDIA_TYPE | Content-Type 缺失或与端点不匹配 | 按 §1.2 提供 JSON 或 multipart，勿手工省略 boundary |
| 415 | UNSUPPORTED_FILE_TYPE | 实际文件类型不支持 | 更换受支持格式 |
| 422 | VALIDATION_FAILED | 参数可解析但不满足业务约束 | 按 fieldErrors 修正 |
| 422 | PARSE_FAILED | 文件损坏、加密或解析失败 | 提供可读文件，勿当作完整解析结果 |
| 422 | INVALID_TRANSITION | 状态转换不合法 | 重读状态及合法步骤 |
| 503 | DEPENDENCY_UNAVAILABLE | 存储、模型或执行依赖暂不可用 | 先查原操作；支持幂等时复用原身份 |

```json
{
  "code": "REVISION_CONFLICT",
  "message": "待办已被修改",
  "requestId": "req-demo",
  "revision": "3"
}
```

## 3. 接口清单总表

下列路径均省略 /api/v1。

| 标识 | 接口名称 | HTTP 方法 | 相对路径 | 成功 HTTP | 鉴权 |
|---|---|---|---|---|---|
| [API-01](#api-01) | 登录账号 | POST | `/session` | 200 | 同源登录 |
| [API-02](#api-02) | 查询当前会话 | GET | `/session` | 200 | 会话 |
| [API-03](#api-03) | 退出当前会话 | DELETE | `/session` | 204 | 会话 + CSRF |
| [API-04](#api-04) | 查询待办列表 | GET | `/todos` | 200 | 会话 |
| [API-05](#api-05) | 创建待办 | POST | `/todos` | 201 | 会话 + CSRF |
| [API-06](#api-06) | 查询待办详情 | GET | `/todos/{id}` | 200 | 会话 |
| [API-07](#api-07) | 更新待办 | PATCH | `/todos/{id}` | 200 | 会话 + CSRF |
| [API-08](#api-08) | 移除待办至回收箱 | DELETE | `/todos/{id}` | 200 | 会话 + CSRF |
| [API-09](#api-09) | 创建日程 | POST | `/calendar/events` | 201 | 会话 + CSRF |
| [API-10](#api-10) | 查询普通日程详情 | GET | `/calendar/events/{id}` | 200 | 会话 |
| [API-11](#api-11) | 更新普通日程 | PATCH | `/calendar/events/{id}` | 200 | 会话 + CSRF |
| [API-12](#api-12) | 移除普通日程至回收箱 | DELETE | `/calendar/events/{id}` | 200 | 会话 + CSRF |
| [API-13](#api-13) | 创建备忘录 | POST | `/notes` | 201 | 会话 + CSRF |
| [API-14](#api-14) | 查询备忘录详情 | GET | `/notes/{id}` | 200 | 会话 |
| [API-15](#api-15) | 更新备忘录 | PATCH | `/notes/{id}` | 200 | 会话 + CSRF |
| [API-16](#api-16) | 移除备忘录至回收箱 | DELETE | `/notes/{id}` | 200 | 会话 + CSRF |
| [API-17](#api-17) | 变更待办状态 | POST | `/todos/{id}/state` | 200 | 会话 + CSRF |
| [API-18](#api-18) | 查询日程实例 | GET | `/calendar/occurrences` | 200 | 会话 |
| [API-19](#api-19) | 查询重复日程实例 | GET | `/calendar/series/{sid}/occurrences/{no}` | 200 | 会话 |
| [API-20](#api-20) | 按范围修改重复日程 | PATCH | `/calendar/series/{sid}/occurrences/{no}` | 200 | 会话 + CSRF |
| [API-21](#api-21) | 按范围删除重复日程 | DELETE | `/calendar/series/{sid}/occurrences/{no}` | 200 | 会话 + CSRF |
| [API-22](#api-22) | 检查日程冲突 | POST | `/calendar/conflicts` | 200 | 会话 + CSRF |
| [API-23](#api-23) | 查询备忘录列表 | GET | `/notes` | 200 | 会话 |
| [API-24](#api-24) | 解除备忘录文件引用 | DELETE | `/notes/{id}/attachments/{assetId}` | 200 | 会话 + CSRF |
| [API-25](#api-25) | 暂存上传文件 | POST | `/uploads` | 201 | 会话 + CSRF |
| [API-26](#api-26) | 清理暂存文件 | DELETE | `/uploads/{id}` | 204 | 会话 + CSRF |
| [API-27](#api-27) | 查询持久文件列表 | GET | `/assets` | 200 | 会话 |
| [API-28](#api-28) | 保存持久文件 | POST | `/assets` | 201 / 200 | 会话 + CSRF |
| [API-29](#api-29) | 查询文件详情 | GET | `/assets/{id}` | 200 | 会话 |
| [API-30](#api-30) | 更新文件及资料库属性 | PATCH | `/assets/{id}` | 200 | 会话 + CSRF |
| [API-31](#api-31) | 移除文件至回收箱 | DELETE | `/assets/{id}` | 200 | 会话 + CSRF |
| [API-32](#api-32) | 读取文件内容 | GET | `/assets/{id}/content` | 200 | 会话 |
| [API-33](#api-33) | 查询文件引用 | GET | `/assets/{id}/references` | 200 | 会话 |
| [API-34](#api-34) | 查询资料库 | GET | `/library` | 200 | 会话 |
| [API-35](#api-35) | 查询事项关系 | GET | `/relations` | 200 | 会话 |
| [API-36](#api-36) | 建立事项关系 | POST | `/relations` | 201 / 200 | 会话 + CSRF |
| [API-37](#api-37) | 解除事项关系 | DELETE | `/relations/{id}` | 204 | 会话 + CSRF |
| [API-38](#api-38) | 搜索业务对象 | GET | `/search` | 200 | 会话 |
| [API-39](#api-39) | 查询回收箱列表 | GET | `/recycle-bin` | 200 | 会话 |
| [API-40](#api-40) | 恢复回收项 | POST | `/recycle-bin/{type}/{itemId}/restore` | 200 | 会话 + CSRF |
| [API-41](#api-41) | 永久删除回收项 | POST | `/recycle-bin/{type}/{itemId}/purge` | 204 / 202 | 会话 + CSRF |
| [API-42](#api-42) | 分析临时输入 | POST | `/agent/analyze` | 200 | 会话 + CSRF |
| [API-43](#api-43) | 预览写操作计划 | POST | `/operations` | 201 / 200 | 会话 + CSRF |
| [API-44](#api-44) | 修订写操作计划 | PUT | `/operations/{id}/plan` | 200 | 会话 + CSRF |
| [API-45](#api-45) | 确认执行计划 | POST | `/operations/{id}/confirm` | 202 | 会话 + CSRF |
| [API-46](#api-46) | 核对操作结果 | GET | `/operations/{id}` | 200 | 会话 |
| [API-47](#api-47) | 重试未完成步骤 | POST | `/operations/{id}/retry` | 202 | 会话 + CSRF |
| [API-48](#api-48) | 终止未领取步骤 | POST | `/operations/{id}/stop` | 202 | 会话 + CSRF |
| [API-49](#api-49) | 预览撤销范围 | POST | `/operations/{id}/undo-preview` | 200 | 会话 + CSRF |
| [API-50](#api-50) | 确认撤销已提交变更 | POST | `/operations/{id}/undo-confirm` | 202 | 会话 + CSRF |
| [API-51](#api-51) | 关闭操作撤销快捷入口 | POST | `/operations/{id}/close-shortcut` | 204 | 会话 + CSRF |
| [API-52](#api-52) | 查询本人通知 | GET | `/notifications` | 200 | 会话 |
| [API-53](#api-53) | 更新通知阅读状态 | PATCH | `/notifications/{id}` | 200 | 会话 + CSRF |
| [API-54](#api-54) | 登记设备推送订阅 | POST | `/push-subscriptions` | 201 / 200 | 会话 + CSRF |
| [API-55](#api-55) | 注销设备推送订阅 | DELETE | `/push-subscriptions/{id}` | 204 | 会话 + CSRF |

## 4. 单接口详情卡

<a id="api-01"></a>
### API-01 登录账号

**POST /session** · v1 · 设计中 · 无需已有会话，同源登录

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| Origin | string | 是 | 无 | $ORIGIN | 1–255 ASCII，必须匹配实际同源 Origin，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| username | string | 是 | 无 | demo_user | 去首尾 U+0020 后 1–80 Unicode 码点；禁止 ASCII 控制字符 U+0000–U+001F、U+007F。 长度算法见 [§1.1](#validation-types)。 |
| password | string | 是 | 无 | DEMO_PASSWORD | 原值 1–128 Unicode 码点，可含空格与 Unicode；按原值校验，禁止裁剪、归一化及截断。 长度算法见 [§1.1](#validation-types)。 |

**前端校验**。提交前对登录名执行上述去空格与长度检查，按原值检查密码长度。长度按 Unicode 码点计数，例如 JavaScript 的 `Array.from(value).length`。字段为空、超限或登录名含禁止字符时，提示对应字段并阻止提交。登录接口校验现有凭证，无需套用注册密码复杂度规则。

**后端校验**。执行同样的规范化与校验。缺失、null、非字符串或违反上述约束时返回 400 `INVALID_REQUEST`，在 `fieldErrors` 中标出 `username` 或 `password`。格式有效但账号或密码错误时返回统一的 401 `AUTH_INVALID`。密码原值不得写入日志或错误响应。80 字符上限依据数据库登录名列，128 码点为本次补充的接口输入上限。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按下方错误码处理。

**调用示例**

```bash
curl -i -X POST -c cookies.txt -H "Origin: $ORIGIN" "$BASE/session" -H 'Content-Type: application/json' --data '{"username":"demo_user","password":"DEMO_PASSWORD"}'
```

**成功响应** · HTTP 200

响应头示例为 `Set-Cookie: JSESSIONID=example-session-id; Path=/; HttpOnly; SameSite=Lax`。生产环境另含 `Secure`。curl 将服务器签发的 Cookie 写入 `cookies.txt`。

[Session](#dto-session)

```json
{
  "user": {
    "id": "1",
    "username": "demo_user"
  },
  "expiresAt": "2026-11-24T18:00:00+08:00",
  "csrfToken": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
}
```

**常见错误**

- 403 `FORBIDDEN`。登录 Origin 缺失或与允许的同源来源不匹配。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_INVALID`。账号或密码错误。核对凭证后登录。

---

<a id="api-02"></a>
### API-02 查询当前会话

**GET /session** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/session"
```

**成功响应** · HTTP 200

[Session](#dto-session)

```json
{
  "user": {
    "id": "1",
    "username": "demo_user"
  },
  "expiresAt": "2026-11-24T18:00:00+08:00",
  "csrfToken": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-03"></a>
### API-03 退出当前会话

**DELETE /session** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

撤销当前会话，停止其未领取的 Agent 步骤并解绑当前设备。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/session"
```

**成功响应** · HTTP 204

无响应体。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-04"></a>
### API-04 查询待办列表

**GET /todos** · v1 · 设计中 · 普通用户，仅本人资源

按截止从近到远，无截止排末。

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| q | string | 否 | 无 | 报告 | 去首尾 U+0020 后 1–200 码点，遵循普通单行文本规则；无关键词时省略。 |
| deadlineFrom | Date | 否 | 无 | 2026-11-24 | 截止下界；采用 [§1.1](#validation-types) 的 UTC+8 Date，成对提供时下界必须早于排他上界。 |
| deadlineTo | Date | 否 | 无 | 2026-12-01 | 截止排他上界；采用 [§1.1](#validation-types) 的 UTC+8 Date，成对提供时下界必须早于排他上界。 |
| status | enum | 否 | 无 | OPEN | OPEN（开放，未逾期的展示状态）、OVERDUE（逾期）、COMPLETED（完成）、CANCELED（取消），仅过滤。 |
| priority | enum | 否 | 无 | NORMAL | NORMAL（常规）、URGENT（紧急）、IMPORTANT（重要）、DEFERABLE（可延后）。 |
| includeCompleted | boolean | 否 | false | true | 指定 status 时优先按状态；仅接受 true/false，见 [§1.1](#validation-types)。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/todos"
```

**成功响应** · HTTP 200

Page<[Todo](#dto-todo)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "101",
      "revision": "1",
      "title": "提交报告",
      "description": null,
      "deadline": {
        "type": "DATE",
        "date": "2026-11-25"
      },
      "priority": "NORMAL",
      "reminder": {
        "mode": "ENABLED"
      },
      "effectiveReminderMode": "ENABLED",
      "status": "OPEN",
      "displayStatus": "OPEN"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-05"></a>
### API-05 创建待办

**POST /todos** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

带关联时原子保存。

请求超时或收到 409 RESULT_PENDING 且尚未获得结果 ID 时，用同一幂等键和原参数重放。首次等待 1 秒，随后等待 2 秒，再以 3 秒间隔退避重放。本轮从首次发现超时或待核实起最多等待 30 秒，累计达到上限后停止自动重放并显示待核实，用户可在重放期内用原键原参继续。收到成功、确定失败或 IDEMPOTENCY_CONFLICT 即停止自动重放。收到会话失效时暂停，重新登录同一账号后方可继续；超过重放期先核对已有业务结果。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |
| Idempotency-Key | UUID v4 | 条件 | 无 | 550e8400-e29b-41d4-a716-446655440005 | 36 字符，使用小写 UUID v4；保持原键与原参数，有效期见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| title | string | 是 | 无 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| description | string/null | 否 | null | 提交 PDF | 普通多行文本，去边缘空白后 1–4,000 码点；null 清空。 |
| deadline | Deadline/null | 否 | null | {"type":"DATE","date":"2026-11-25"} | deadline 为两种精度之一，按 [§5.1](#validation-nested)；null 清空。 |
| priority | enum | 否 | NORMAL | NORMAL | NORMAL（常规）、URGENT（紧急）、IMPORTANT（重要）、DEFERABLE（可延后）。 |
| reminder | TodoReminder | 否 | ENABLED | {"mode":"ENABLED"} | 遵守 [§5.1](#validation-nested) 的 TodoReminder 分支，省略或显式禁用按卡片默认值。 |
| links | Ref[] | 否 | [] | [] | 0–20 个不同的合法端点，已有文件和 newAssets 合计附件最多 20 个，Ref 见 [§5.1](#validation-nested)；仅关联本人活动对象。 |
| newAssets | object[] | 否 | [] | [] | 0–20 个项目，使用 API-28 Body，uploadId 唯一。与 links 中已有文件合计附件最多 20 个；非空时必填幂等头，见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/todos" -H 'Content-Type: application/json' --data '{"title":"提交报告","deadline":{"type":"DATE","date":"2026-11-25"}}'
```

**成功响应** · HTTP 201

[Todo](#dto-todo)

```json
{
  "id": "101",
  "revision": "1",
  "title": "提交报告",
  "description": null,
  "deadline": {
    "type": "DATE",
    "date": "2026-11-25"
  },
  "priority": "NORMAL",
  "reminder": {
    "mode": "ENABLED"
  },
  "effectiveReminderMode": "ENABLED",
  "status": "OPEN",
  "displayStatus": "OPEN"
}
```

**常见错误**

- 409 `IDEMPOTENCY_CONFLICT`。同一键携带不同参数。原样重放；新意图才换键。
- 409 `RESULT_PENDING`。仍有在途或未知结果。按原意图核对，勿换键重试。
- 409 `UPLOAD_EXPIRED`。暂存文件过期或已失效。先核对原保存结果，必要时重新上传。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-06"></a>
### API-06 查询待办详情

**GET /todos/{id}** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 101 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/todos/101"
```

**成功响应** · HTTP 200

[Todo](#dto-todo)

```json
{
  "id": "101",
  "revision": "1",
  "title": "提交报告",
  "description": null,
  "deadline": {
    "type": "DATE",
    "date": "2026-11-25"
  },
  "priority": "NORMAL",
  "reminder": {
    "mode": "ENABLED"
  },
  "effectiveReminderMode": "ENABLED",
  "status": "OPEN",
  "displayStatus": "OPEN"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-07"></a>
### API-07 更新待办

**PATCH /todos/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 101 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| title | string | 否 | 保留原值 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| description | string/null | 否 | 保留原值 | 提交 PDF | 普通多行文本，去边缘空白后 1–4,000 码点；null 清空。 |
| deadline | Deadline/null | 否 | 保留原值 | {"type":"DATE","date":"2026-11-25"} | deadline 为两种精度之一，按 [§5.1](#validation-nested)；null 清空。 |
| priority | enum | 否 | 保留原值 | NORMAL | NORMAL（常规）、URGENT（紧急）、IMPORTANT（重要）、DEFERABLE（可延后）。 |
| reminder | TodoReminder | 否 | 保留原值 | {"mode":"ENABLED"} | 遵守 [§5.1](#validation-nested) 的 TodoReminder 分支，省略或显式禁用按卡片默认值。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/todos/101" -H 'Content-Type: application/json' --data '{"revision":"1","title":"更新标题"}'
```

**成功响应** · HTTP 200

[Todo](#dto-todo)

```json
{
  "id": "101",
  "revision": "2",
  "title": "更新标题",
  "description": null,
  "deadline": {
    "type": "DATE",
    "date": "2026-11-25"
  },
  "priority": "NORMAL",
  "reminder": {
    "mode": "ENABLED"
  },
  "effectiveReminderMode": "ENABLED",
  "status": "OPEN",
  "displayStatus": "OPEN"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-08"></a>
### API-08 移除待办至回收箱

**DELETE /todos/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 101 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/todos/101?revision=1"
```

**成功响应** · HTTP 200

[Deleted](#dto-deleted)

```json
{
  "target": {
    "type": "TODO",
    "id": "101"
  },
  "revision": "2",
  "recycleItemId": "601",
  "recycleRevision": "1"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-09"></a>
### API-09 创建日程

**POST /calendar/events** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

重复创建返回系列首实例。

请求超时或收到 409 RESULT_PENDING 且尚未获得结果 ID 时，用同一幂等键和原参数重放。首次等待 1 秒，随后等待 2 秒，再以 3 秒间隔退避重放。本轮从首次发现超时或待核实起最多等待 30 秒，累计达到上限后停止自动重放并显示待核实，用户可在重放期内用原键原参继续。收到成功、确定失败或 IDEMPOTENCY_CONFLICT 即停止自动重放。收到会话失效时暂停，重新登录同一账号后方可继续；超过重放期先核对已有业务结果。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |
| Idempotency-Key | UUID v4 | 条件 | 无 | 550e8400-e29b-41d4-a716-446655440009 | 36 字符，使用小写 UUID v4；保持原键与原参数，有效期见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| title | string | 是 | 无 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| date | Date | 是 | 无 | 2026-12-01 | 实际业务日；采用 [§1.1](#validation-types) 的 UTC+8 Date。 |
| allDay | boolean | 是 | 无 | true | 全天标记；仅接受 true/false，见 [§1.1](#validation-types)。 |
| startTime | Time/null | 条件 | null | 09:00 | 定时必填，全天为空；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| endTime | Time/null | 条件 | null | 10:00 | 同日，不早于开始；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| description | string/null | 否 | null | 比赛说明 | 普通多行文本，去边缘空白后 1–4,000 码点；null 清空。 |
| location | string/null | 否 | null | 会场 | 普通单行文本，去首尾 U+0020 后 1–255 码点；null 清空。 |
| recurrence | Recurrence/null | 否 | null | {"type":"DAILY"} | 创建可省略或传 null 表示普通日程；重复分支及字段约束见 [§5.1](#validation-nested)。 |
| reminder | EventReminder | 否 | NONE | {"type":"ALL_DAY_AT_TIME","daysBefore":1,"reminderTime":"20:00"} | 遵守 [§5.1](#validation-nested) 的 EventReminder 分支，省略或显式禁用按卡片默认值。 |
| links | Ref[] | 否 | [] | [] | 0–20 个不同的合法端点，已有文件和 newAssets 合计附件最多 20 个，Ref 见 [§5.1](#validation-nested)；仅关联本人活动对象。 |
| newAssets | object[] | 否 | [] | [] | 0–20 个项目，使用 API-28 Body，uploadId 唯一。与 links 中已有文件合计附件最多 20 个；非空时必填幂等头，见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/events" -H 'Content-Type: application/json' --data '{"title":"全天比赛","date":"2026-12-01","allDay":true,"reminder":{"type":"ALL_DAY_AT_TIME","daysBefore":1,"reminderTime":"20:00"}}'
```

**成功响应** · HTTP 201

[Event](#dto-event)

```json
{
  "id": "201",
  "revision": "1",
  "title": "全天比赛",
  "date": "2026-12-01",
  "allDay": true,
  "startTime": null,
  "endTime": null,
  "description": null,
  "location": null,
  "recurrence": null,
  "reminder": {
    "type": "ALL_DAY_AT_TIME",
    "daysBefore": 1,
    "reminderTime": "20:00"
  }
}
```

**常见错误**

- 409 `IDEMPOTENCY_CONFLICT`。同一键携带不同参数。原样重放；新意图才换键。
- 409 `RESULT_PENDING`。仍有在途或未知结果。按原意图核对，勿换键重试。
- 409 `UPLOAD_EXPIRED`。暂存文件过期或已失效。先核对原保存结果，必要时重新上传。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-10"></a>
### API-10 查询普通日程详情

**GET /calendar/events/{id}** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 201 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/calendar/events/201"
```

**成功响应** · HTTP 200

[Event](#dto-event)

```json
{
  "id": "201",
  "revision": "1",
  "title": "全天比赛",
  "date": "2026-12-01",
  "allDay": true,
  "startTime": null,
  "endTime": null,
  "description": null,
  "location": null,
  "recurrence": null,
  "reminder": {
    "type": "ALL_DAY_AT_TIME",
    "daysBefore": 1,
    "reminderTime": "20:00"
  }
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-11"></a>
### API-11 更新普通日程

**PATCH /calendar/events/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 201 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| title | string | 否 | 保留原值 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| date | Date | 否 | 保留原值 | 2026-12-01 | 实际业务日；采用 [§1.1](#validation-types) 的 UTC+8 Date。 |
| allDay | boolean | 否 | 保留原值 | true | 全天标记；仅接受 true/false，见 [§1.1](#validation-types)。 |
| startTime | Time/null | 否 | 保留原值 | 09:00 | 定时必填，全天为空；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| endTime | Time/null | 否 | 保留原值 | 10:00 | 同日，不早于开始；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| description | string/null | 否 | 保留原值 | 比赛说明 | 普通多行文本，去边缘空白后 1–4,000 码点；null 清空。 |
| location | string/null | 否 | 保留原值 | 会场 | 普通单行文本，去首尾 U+0020 后 1–255 码点；null 清空。 |
| reminder | EventReminder | 否 | 保留原值 | {"type":"ALL_DAY_AT_TIME","daysBefore":1,"reminderTime":"20:00"} | 遵守 [§5.1](#validation-nested) 的 EventReminder 分支，省略或显式禁用按卡片默认值。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/events/201" -H 'Content-Type: application/json' --data '{"revision":"1","title":"更新标题"}'
```

**成功响应** · HTTP 200

[Event](#dto-event)

```json
{
  "id": "201",
  "revision": "2",
  "title": "更新标题",
  "date": "2026-12-01",
  "allDay": true,
  "startTime": null,
  "endTime": null,
  "description": null,
  "location": null,
  "recurrence": null,
  "reminder": {
    "type": "ALL_DAY_AT_TIME",
    "daysBefore": 1,
    "reminderTime": "20:00"
  }
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-12"></a>
### API-12 移除普通日程至回收箱

**DELETE /calendar/events/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 201 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/events/201?revision=1"
```

**成功响应** · HTTP 200

[Deleted](#dto-deleted)

```json
{
  "target": {
    "type": "CALENDAR_EVENT",
    "id": "201"
  },
  "revision": "2",
  "recycleItemId": "601",
  "recycleRevision": "1"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-13"></a>
### API-13 创建备忘录

**POST /notes** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

正文附件必须引用本人持久文件。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| title | string | 是 | 无 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| body | Node[]/null | 否 | [] | [] | 0–500 个合法节点；累计文字最多 20,000 码点、附件最多 20 个。null 或 [] 清空，见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/notes" -H 'Content-Type: application/json' --data '{"title":"比赛准备","body":[]}'
```

**成功响应** · HTTP 201

[Note](#dto-note)

```json
{
  "id": "301",
  "revision": "1",
  "title": "比赛准备",
  "body": [
    {
      "type": "CHECKLIST",
      "items": [
        {
          "runs": [
            {
              "text": "打印材料"
            }
          ],
          "checked": false
        }
      ]
    }
  ]
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-14"></a>
### API-14 查询备忘录详情

**GET /notes/{id}** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 301 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/notes/301"
```

**成功响应** · HTTP 200

[Note](#dto-note)

```json
{
  "id": "301",
  "revision": "1",
  "title": "比赛准备",
  "body": [
    {
      "type": "CHECKLIST",
      "items": [
        {
          "runs": [
            {
              "text": "打印材料"
            }
          ],
          "checked": false
        }
      ]
    }
  ]
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-15"></a>
### API-15 更新备忘录

**PATCH /notes/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 301 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| title | string | 否 | 保留原值 | 提交报告 | 去首尾 U+0020 后 1–200 码点，普通单行文本，不允许 null 或空串。 |
| body | Node[]/null | 否 | 保留原值 | [] | 0–500 个合法节点；累计文字最多 20,000 码点、附件最多 20 个。null 或 [] 清空，见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/notes/301" -H 'Content-Type: application/json' --data '{"revision":"1","title":"更新标题"}'
```

**成功响应** · HTTP 200

[Note](#dto-note)

```json
{
  "id": "301",
  "revision": "2",
  "title": "更新标题",
  "body": [
    {
      "type": "CHECKLIST",
      "items": [
        {
          "runs": [
            {
              "text": "打印材料"
            }
          ],
          "checked": false
        }
      ]
    }
  ]
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-16"></a>
### API-16 移除备忘录至回收箱

**DELETE /notes/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 301 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/notes/301?revision=1"
```

**成功响应** · HTTP 200

[Deleted](#dto-deleted)

```json
{
  "target": {
    "type": "NOTE",
    "id": "301"
  },
  "revision": "2",
  "recycleItemId": "601",
  "recycleRevision": "1"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-17"></a>
### API-17 变更待办状态

**POST /todos/{id}/state** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

完成和取消之间先重开。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 101 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| action | enum | 是 | 无 | COMPLETE | COMPLETE（完成）、CANCEL（取消）、REOPEN（重开）；合法转换见 [§5.3](#validation-states)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/todos/101/state" -H 'Content-Type: application/json' --data '{"revision":"1","action":"COMPLETE"}'
```

**成功响应** · HTTP 200

[Todo](#dto-todo)

```json
{
  "id": "101",
  "revision": "2",
  "title": "提交报告",
  "description": null,
  "deadline": {
    "type": "DATE",
    "date": "2026-11-25"
  },
  "priority": "NORMAL",
  "reminder": {
    "mode": "ENABLED"
  },
  "effectiveReminderMode": "ENABLED",
  "status": "COMPLETED",
  "displayStatus": "COMPLETED"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 422 `INVALID_TRANSITION`。状态转换不合法。重读状态及合法步骤。

---

<a id="api-18"></a>
### API-18 查询日程实例

**GET /calendar/occurrences** · v1 · 设计中 · 普通用户，仅本人资源

用实际日期匹配，排除跳过或软删实例。

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| from | Date | 是 | 无 | 2026-12-01 | 起始业务日；采用 [§1.1](#validation-types) 的 UTC+8 Date，下界必须早于排他上界。 |
| to | Date | 是 | 无 | 2026-12-08 | 排他结束日，范围最多 93 天；采用 [§1.1](#validation-types) 的 UTC+8 Date，成对提供时下界必须早于排他上界。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/calendar/occurrences?from=2026-12-01&to=2026-12-08"
```

**成功响应** · HTTP 200

Page<[Event](#dto-event)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "201",
      "revision": "1",
      "title": "全天比赛",
      "date": "2026-12-01",
      "allDay": true,
      "startTime": null,
      "endTime": null,
      "description": null,
      "location": null,
      "recurrence": null,
      "reminder": {
        "type": "ALL_DAY_AT_TIME",
        "daysBefore": 1,
        "reminderTime": "20:00"
      }
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-19"></a>
### API-19 查询重复日程实例

**GET /calendar/series/{sid}/occurrences/{no}** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| sid | PosID | 是 | 无 | 210 | 系列 ID；正数标识，按 [§1.1](#validation-types) 校验。 |
| no | PosID | 是 | 无 | 3 | 原实例序号；正数标识，按 [§1.1](#validation-types) 校验。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/calendar/series/210/occurrences/3"
```

**成功响应** · HTTP 200

[Event](#dto-event)

```json
{
  "revision": "1",
  "title": "全天比赛",
  "date": "2026-12-01",
  "allDay": true,
  "startTime": null,
  "endTime": null,
  "description": null,
  "location": null,
  "recurrence": {
    "type": "DAILY"
  },
  "reminder": {
    "type": "ALL_DAY_AT_TIME",
    "daysBefore": 1,
    "reminderTime": "20:00"
  },
  "seriesId": "210",
  "occurrenceNo": "3"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-20"></a>
### API-20 按范围修改重复日程

**PATCH /calendar/series/{sid}/occurrences/{no}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

按原序号处理范围；整个系列修改保留已发生历史。

变更后，以返回的 seriesId 和 scope 对应的原序号范围标记已加载实例失效；THIS 处理选中原序号，THIS_AND_FOLLOWING 处理选中及后续原序号，ENTIRE_SERIES 处理系列缓存。重新调用 API-18 读取已加载的日期窗口，包括原先未出现该系列的窗口，因为移动可能让实例进入这些窗口。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| sid | PosID | 是 | 无 | 210 | 系列 ID；正数标识，按 [§1.1](#validation-types) 校验。 |
| no | PosID | 是 | 无 | 3 | 原实例序号；正数标识，按 [§1.1](#validation-types) 校验。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| scope | enum | 是 | 无 | THIS | THIS（仅本次）、THIS_AND_FOLLOWING（本次及以后）、ENTIRE_SERIES（整个系列），见 [§5.1](#validation-nested)。 |
| changes | object | 是 | 无 | {"title":"改名"} | 至少一个修改字段，限定为 API-09 的 title、date、allDay、startTime、endTime、description、location、recurrence、reminder；THIS 禁止 recurrence；其余合并校验见 [§5.1](#validation-nested)、[§5.3](#validation-states)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/series/210/occurrences/3" -H 'Content-Type: application/json' --data '{"revision":"1","scope":"THIS","changes":{"title":"改名"}}'
```

**成功响应** · HTTP 200

[ScopeResult](#dto-scoperesult)

```json
{
  "seriesId": "210",
  "occurrenceNo": "3",
  "scope": "THIS",
  "revision": "2",
  "changed": true
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-21"></a>
### API-21 按范围删除重复日程

**DELETE /calendar/series/{sid}/occurrences/{no}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

整个系列删除包含历史；仅本次删除保留可恢复遮蔽。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| sid | PosID | 是 | 无 | 210 | 系列 ID；正数标识，按 [§1.1](#validation-types) 校验。 |
| no | PosID | 是 | 无 | 3 | 原实例序号；正数标识，按 [§1.1](#validation-types) 校验。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| scope | enum | 是 | 无 | THIS | THIS（仅本次）、THIS_AND_FOLLOWING（本次及以后）、ENTIRE_SERIES（整个系列），见 [§5.1](#validation-nested)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/series/210/occurrences/3?revision=1&scope=THIS"
```

**成功响应** · HTTP 200

[Deleted](#dto-deleted)

```json
{
  "target": {
    "type": "CALENDAR_SERIES",
    "id": "210"
  },
  "revision": "2",
  "recycleItemId": "601",
  "recycleRevision": "1"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-22"></a>
### API-22 检查日程冲突

**POST /calendar/conflicts** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

仅当前操作日；空列表表示无冲突，存在冲突不阻止保存。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| date | Date | 是 | 无 | 2026-12-01 | 实际业务日；采用 [§1.1](#validation-types) 的 UTC+8 Date。 |
| allDay | boolean | 是 | 无 | true | 全天标记；仅接受 true/false，见 [§1.1](#validation-types)。 |
| startTime | Time/null | 条件 | null | 09:00 | 定时必填，全天为空；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| endTime | Time/null | 条件 | null | 10:00 | 同日，不早于开始；同日并按 [§1.1](#validation-types) 校验，最终对象需满足 [§5.3](#validation-states)。 |
| exclude | object | 否 | 无 | {"id":"201"} | 仅普通 PosID 或系列 PosID + 原序号二选一，见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/calendar/conflicts" -H 'Content-Type: application/json' --data '{"date":"2026-12-01","allDay":true}'
```

**成功响应** · HTTP 200

[Conflicts](#dto-conflicts)

```json
{
  "conflicts": []
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-23"></a>
### API-23 查询备忘录列表

**GET /notes** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| q | string | 否 | 无 | 报告 | 去首尾 U+0020 后 1–200 码点，遵循普通单行文本规则；无关键词时省略。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/notes"
```

**成功响应** · HTTP 200

Page<[Note](#dto-note)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "301",
      "revision": "1",
      "title": "比赛准备",
      "body": [
        {
          "type": "CHECKLIST",
          "items": [
            {
              "runs": [
                {
                  "text": "打印材料"
                }
              ],
              "checked": false
            }
          ]
        }
      ]
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-24"></a>
### API-24 解除备忘录文件引用

**DELETE /notes/{id}/attachments/{assetId}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

可从回收箱引用明细发起，保持备忘录原状态。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 301 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |
| assetId | PosID | 是 | 无 | 401 | 附件文件 ID；正数标识，按 [§1.1](#validation-types) 校验。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/notes/301/attachments/401?revision=1"
```

**成功响应** · HTTP 200

[AttachmentRemoved](#dto-attachmentremoved)

```json
{
  "target": {
    "type": "NOTE",
    "id": "301"
  },
  "revision": "2",
  "changed": true
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-25"></a>
### API-25 暂存上传文件

**POST /uploads** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body（multipart/form-data）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| file | binary | 是 | 无 | @notice.pdf | multipart 中恰好一个名为 file 的 part，1–10,485,760 字节。文件名为 1–255 码点的 basename，不含路径分隔符和控制字符。MIME、扩展名与解析上限见 [§5.2](#validation-upload)。 |
| interactionId | UUID | 否 | 无 | 550e8400-e29b-41d4-a716-446655440003 | 当前交互 UUID，格式 [§1.1](#validation-types)；如携带，须与上传所属交互一致。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/uploads" -F 'file=@notice.pdf'
```

**成功响应** · HTTP 201

[Upload](#dto-upload)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "fileName": "notice.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 2048,
  "expiresAt": "2026-11-25T10:00:00+08:00",
  "interactionId": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 413 `INPUT_TOO_LARGE`。输入超过容量上限。按输入边界缩小文件或文本。
- 415 `UNSUPPORTED_FILE_TYPE`。实际文件类型不支持。更换受支持格式。

---

<a id="api-26"></a>
### API-26 清理暂存文件

**DELETE /uploads/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

只释放指定本人暂存对象，已晋升的持久资产独立处理。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440001 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/uploads/550e8400-e29b-41d4-a716-446655440001"
```

**成功响应** · HTTP 204

无响应体。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-27"></a>
### API-27 查询持久文件列表

**GET /assets** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| q | string | 否 | 无 | 报告 | 去首尾 U+0020 后 1–200 码点，遵循普通单行文本规则；无关键词时省略。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/assets"
```

**成功响应** · HTTP 200

Page<[Asset](#dto-asset)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "401",
      "revision": "1",
      "fileName": "notice.pdf",
      "mediaType": "application/pdf",
      "sizeBytes": 2048,
      "displayName": "比赛通知",
      "purpose": null,
      "keywords": [],
      "inLibrary": true,
      "uploadedAt": "2026-11-24T10:00:00+08:00"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-28"></a>
### API-28 保存持久文件

**POST /assets** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

首次创建 201，已提交同键同参重放 200。

请求超时或收到 409 RESULT_PENDING 且尚未获得结果 ID 时，用同一幂等键和原参数重放。首次等待 1 秒，随后等待 2 秒，再以 3 秒间隔退避重放。本轮从首次发现超时或待核实起最多等待 30 秒，累计达到上限后停止自动重放并显示待核实，用户可在重放期内用原键原参继续。收到成功、确定失败或 IDEMPOTENCY_CONFLICT 即停止自动重放。收到会话失效时暂停，重新登录同一账号后方可继续；超过重放期先核对已有业务结果。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |
| Idempotency-Key | UUID v4 | 是 | 无 | 550e8400-e29b-41d4-a716-446655440028 | 36 字符，使用小写 UUID v4；保持原键与原参数，有效期见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| uploadId | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440001 | 本人有效且可用的暂存 UUID，见 [§1.1](#validation-types)。过期/不可再次晋升返回 409。 |
| displayName | string | 否 | 原始文件名 | 比赛通知 | 去首尾 U+0020 后 1–255 码点，普通单行文本；不可为 null。 |
| purpose | string/null | 否 | null | 赛程 | 去首尾 U+0020 后 1–500 码点，普通单行文本；null 清空。 |
| keywords | string[] | 否 | [] | ["比赛"] | 0–12 个不重复关键词，每个去首尾 U+0020 后 1–32 码点；[] 清空。 |
| inLibrary | boolean | 否 | false | true | 资料库成员资格；仅接受 true/false，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/assets" -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440028' -H 'Content-Type: application/json' --data '{"uploadId":"550e8400-e29b-41d4-a716-446655440001","inLibrary":true,"displayName":"比赛通知"}'
```

**成功响应** · HTTP 201 / 200

[Asset](#dto-asset)

```json
{
  "id": "401",
  "revision": "1",
  "fileName": "notice.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 2048,
  "displayName": "比赛通知",
  "purpose": null,
  "keywords": [],
  "inLibrary": true,
  "uploadedAt": "2026-11-24T10:00:00+08:00"
}
```

**常见错误**

- 409 `RESULT_PENDING`。仍有在途或未知结果。按原意图核对，勿换键重试。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `UPLOAD_EXPIRED`。暂存文件过期或已失效。先核对原保存结果，必要时重新上传。
- 409 `IDEMPOTENCY_CONFLICT`。同一键携带不同参数。原样重放；新意图才换键。

---

<a id="api-29"></a>
### API-29 查询文件详情

**GET /assets/{id}** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 401 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/assets/401"
```

**成功响应** · HTTP 200

[Asset](#dto-asset)

```json
{
  "id": "401",
  "revision": "1",
  "fileName": "notice.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 2048,
  "displayName": "比赛通知",
  "purpose": null,
  "keywords": [],
  "inLibrary": true,
  "uploadedAt": "2026-11-24T10:00:00+08:00"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-30"></a>
### API-30 更新文件及资料库属性

**PATCH /assets/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 401 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| displayName | string | 否 | 保留原值 | 比赛通知 | 去首尾 U+0020 后 1–255 码点，普通单行文本；不可为 null。 |
| purpose | string/null | 否 | 保留原值 | 赛程 | 去首尾 U+0020 后 1–500 码点，普通单行文本；null 清空。 |
| keywords | string[] | 否 | 保留原值 | ["比赛"] | 0–12 个不重复关键词，每个去首尾 U+0020 后 1–32 码点；[] 清空。 |
| inLibrary | boolean | 否 | 保留原值 | true | 资料库成员资格；仅接受 true/false，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/assets/401" -H 'Content-Type: application/json' --data '{"revision":"1","displayName":"更新后的比赛通知"}'
```

**成功响应** · HTTP 200

[Asset](#dto-asset)

```json
{
  "id": "401",
  "revision": "2",
  "fileName": "notice.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 2048,
  "displayName": "更新后的比赛通知",
  "purpose": null,
  "keywords": [],
  "inLibrary": true,
  "uploadedAt": "2026-11-24T10:00:00+08:00"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-31"></a>
### API-31 移除文件至回收箱

**DELETE /assets/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 401 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/assets/401?revision=1"
```

**成功响应** · HTTP 200

[Deleted](#dto-deleted)

```json
{
  "target": {
    "type": "ASSET",
    "id": "401"
  },
  "revision": "2",
  "recycleItemId": "601",
  "recycleRevision": "1"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `ASSET_IN_USE`。文件仍被事项关系或正文引用。查询引用，按需解除后再试。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-32"></a>
### API-32 读取文件内容

**GET /assets/{id}/content** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 401 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| download | boolean | 否 | false | true | true 强制下载；不可内联的类型也以附件返回；仅接受 true/false，见 [§1.1](#validation-types)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -D headers.txt -X GET -b cookies.txt "$BASE/assets/401/content" -o notice.pdf
```

**成功响应** · HTTP 200

文件字节流。Content-Type 为媒体类型，Content-Disposition 标示内联或附件。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-33"></a>
### API-33 查询文件引用

**GET /assets/{id}/references** · v1 · 设计中 · 普通用户，仅本人资源

同时返回关系和备忘录正文引用，包含回收箱中的有效引用。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 401 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/assets/401/references"
```

**成功响应** · HTTP 200

Page<[AssetRef](#dto-assetref)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "kind": "RELATION",
      "ref": {
        "type": "TODO",
        "id": "101"
      },
      "inRecycleBin": false,
      "revision": "1",
      "relationId": "501"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-34"></a>
### API-34 查询资料库

**GET /library** · v1 · 设计中 · 普通用户，仅本人资源

仅资料库成员。q 在名称、用途、关键词中查找；keyword 为关键词筛选。按上传时间、ID 降序。

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| q | string | 否 | 无 | 报告 | 去首尾 U+0020 后 1–200 码点，遵循普通单行文本规则；无关键词时省略。 |
| keyword | string | 否 | 无 | 比赛 | 去首尾 U+0020 后 1–32 码点，普通单行文本。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/library"
```

**成功响应** · HTTP 200

Page<[Asset](#dto-asset)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "401",
      "revision": "1",
      "fileName": "notice.pdf",
      "mediaType": "application/pdf",
      "sizeBytes": 2048,
      "displayName": "比赛通知",
      "purpose": null,
      "keywords": [],
      "inLibrary": true,
      "uploadedAt": "2026-11-24T10:00:00+08:00"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-35"></a>
### API-35 查询事项关系

**GET /relations** · v1 · 设计中 · 普通用户，仅本人资源

软删端点保留关系并提示，永久删除后仅提供缺失信息。

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| type | enum | 是 | 无 | TODO | TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（系列）、NOTE（备忘录）、ASSET（文件）；与目标一致，见 [§5.1](#validation-nested)。 |
| id | PosID | 是 | 无 | 101 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/relations?type=TODO&id=101"
```

**成功响应** · HTTP 200

Page<[RelationEntry](#dto-relationentry)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "relation": {
        "id": "501",
        "left": {
          "type": "TODO",
          "id": "101"
        },
        "right": {
          "type": "ASSET",
          "id": "401"
        }
      },
      "otherEndpointState": "ACTIVE"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-36"></a>
### API-36 建立事项关系

**POST /relations** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

同一有效端点对返回 200。支持待办–日程、待办–备忘录、日程–备忘录和待办/日程–文件。Note 正文附件使用 Note 接口。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| left | Ref | 是 | 无 | 见请求示例 | 类型和 id 必填，见 [§5.1](#validation-nested)；两端须为本人活动对象且类型组合受支持。 |
| right | Ref | 是 | 无 | 见请求示例 | 类型和 id 必填，见 [§5.1](#validation-nested)；两端须为本人活动对象且类型组合受支持。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/relations" -H 'Content-Type: application/json' --data '{"left":{"type":"TODO","id":"101"},"right":{"type":"ASSET","id":"401"}}'
```

**成功响应** · HTTP 201 / 200

[Relation](#dto-relation)

```json
{
  "id": "501",
  "left": {
    "type": "TODO",
    "id": "101"
  },
  "right": {
    "type": "ASSET",
    "id": "401"
  }
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-37"></a>
### API-37 解除事项关系

**DELETE /relations/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 501 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/relations/501"
```

**成功响应** · HTTP 204

无响应体。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-38"></a>
### API-38 搜索业务对象

**GET /search** · v1 · 设计中 · 普通用户，仅本人资源

支持待办、日程、备忘录；资料库查询走 /library。

q 可用于所有类型。status 仅用于 TODO。from/to 可独立提供，区间左闭右开：TODO 按截止业务日筛选（有日期筛选时排除无截止项），CALENDAR_EVENT 和 CALENDAR_SERIES 按实际展示日期筛选，NOTE 不接受日期筛选。多个条件同时满足。类型与参数组合不合法或同时提供的下界不早于上界时，返回 400 INVALID_REQUEST。

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| type | enum | 是 | 无 | TODO | TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（重复日程）、NOTE（备忘录）。 |
| q | string | 否 | 无 | 报告 | 去首尾 U+0020 后 1–200 码点，遵循普通单行文本规则；无关键词时省略。 |
| from | Date | 否 | 无 | 2026-11-24 | 业务日期下界，限日程/待办；采用 [§1.1](#validation-types) 的 UTC+8 Date，成对提供时下界必须早于排他上界。 |
| to | Date | 否 | 无 | 2026-12-01 | 排他上界，限日程/待办；采用 [§1.1](#validation-types) 的 UTC+8 Date，成对提供时下界必须早于排他上界。 |
| status | enum | 否 | 无 | OPEN | OPEN（开放，未逾期的展示状态）、OVERDUE（逾期）、COMPLETED（完成）、CANCELED（取消），仅适用于 TODO。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/search?type=TODO&q=%E6%8A%A5%E5%91%8A"
```

**成功响应** · HTTP 200

Page<[SearchHit](#dto-searchhit)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "ref": {
        "type": "TODO",
        "id": "101"
      },
      "title": "提交报告",
      "summary": null
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-39"></a>
### API-39 查询回收箱列表

**GET /recycle-bin** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| type | enum | 是 | 无 | TODO | TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（系列）、NOTE（备忘录）、ASSET（文件）；与目标一致，见 [§5.1](#validation-nested)。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/recycle-bin?type=TODO"
```

**成功响应** · HTTP 200

Page<[RecycleItem](#dto-recycleitem)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "601",
      "target": {
        "type": "TODO",
        "id": "101"
      },
      "revision": "1",
      "title": "提交报告",
      "deletedAt": "2026-11-24T10:00:00+08:00"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-40"></a>
### API-40 恢复回收项

**POST /recycle-bin/{type}/{itemId}/restore** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

使用回收项 ID 和修订，恢复原对象而非新建。

恢复成功后，使用返回的 target.type 和 target.id 查询 API-35，按页读取保留的关系及缺失端点的类型和原因。unavailableReferences 用于提示仍不可用的引用；已经主动解除的关系不重建。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| type | enum | 是 | 无 | TODO | TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（系列）、NOTE（备忘录）、ASSET（文件）；与目标一致，见 [§5.1](#validation-nested)。 |
| itemId | RecycleID | 是 | 无 | 601 | 类型决定格式；按 [§1.1](#validation-types) 使用服务端返回的回收项 ID。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 使用 API-39 返回的回收项 revision；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/recycle-bin/TODO/601/restore" -H 'Content-Type: application/json' --data '{"revision":"1"}'
```

**成功响应** · HTTP 200

[Restored](#dto-restored)

```json
{
  "target": {
    "type": "TODO",
    "id": "101"
  },
  "revision": "3",
  "unavailableReferences": []
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `STATE_CONFLICT`。当前生命周期不允许操作。刷新对象状态。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-41"></a>
### API-41 永久删除回收项

**POST /recycle-bin/{type}/{itemId}/purge** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

普通业务清除返回 204；文件进入 DELETING 返回 202 及示例响应。Agent 不可调用。

文件的 202 只确认已进入不可恢复的后台清理队列。界面显示已受理清理并结束交互，不等待物理删除；清理失败由后台批次重试。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| type | enum | 是 | 无 | ASSET | TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（系列）、NOTE（备忘录）、ASSET（文件）；与目标一致，见 [§5.1](#validation-nested)。 |
| itemId | RecycleID | 是 | 无 | 601 | 类型决定格式；按 [§1.1](#validation-types) 使用服务端返回的回收项 ID。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 使用 API-39 返回的回收项 revision；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| confirmed | boolean | 是 | 无 | true | 用户本人已二次确认；仅接受 true/false，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/recycle-bin/ASSET/601/purge" -H 'Content-Type: application/json' --data '{"revision":"1","confirmed":true}'
```

**成功响应** · HTTP 204 / 202

[Purging](#dto-purging)

```json
{
  "target": {
    "type": "ASSET",
    "id": "401"
  },
  "status": "DELETING"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `ASSET_IN_USE`。文件仍被事项关系或正文引用。查询引用，按需解除后再试。
- 409 `STATE_CONFLICT`。当前生命周期不允许操作。刷新对象状态。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-42"></a>
### API-42 分析临时输入

**POST /agent/analyze** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

只返回候选或问题，来源不写入业务对象。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| interactionId | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440003 | 当前交互 UUID，格式 [§1.1](#validation-types)；如携带，须与上传所属交互一致。 |
| prompt | string | 是 | 无 | 请整理待办 | 去首尾空白后 1–20,000 码点，可多行；遵循多行文本规则。 |
| input | AnalysisInput | 否 | 无 | {"type":"TEXT","text":"请提交报告"} | 至多一份输入，分支条件见 [§5.1](#validation-nested)；省略表示仅提示文本。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/agent/analyze" -H 'Content-Type: application/json' --data '{"interactionId":"550e8400-e29b-41d4-a716-446655440003","prompt":"请整理待办","input":{"type":"TEXT","text":"请提交报告"}}'
```

**成功响应** · HTTP 200

[Analysis](#dto-analysis)

```json
{
  "kind": "CLARIFICATION",
  "candidates": [],
  "questions": [
    {
      "id": "q1",
      "text": "提交报告的截止日期是什么？"
    }
  ]
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 422 `PARSE_FAILED`。文件损坏、加密或解析失败。提供可读文件，勿当作完整解析结果。
- 409 `UPLOAD_EXPIRED`。暂存文件过期或已失效。先核对原保存结果，必要时重新上传。
- 503 `DEPENDENCY_UNAVAILABLE`。存储、模型或执行依赖暂不可用。先查原操作；支持幂等时复用原身份。

---

<a id="api-43"></a>
### API-43 预览写操作计划

**POST /operations** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

请求超时或收到 409 RESULT_PENDING 且尚未获得结果 ID 时，用同一幂等键和原参数重放。首次等待 1 秒，随后等待 2 秒，再以 3 秒间隔退避重放。本轮从首次发现超时或待核实起最多等待 30 秒，累计达到上限后停止自动重放并显示待核实，用户可在重放期内用原键原参继续。收到成功、确定失败或 IDEMPOTENCY_CONFLICT 即停止自动重放。收到会话失效时暂停，重新登录同一账号后方可继续；超过重放期先核对已有业务结果。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |
| Idempotency-Key | UUID v4 | 是 | 无 | 550e8400-e29b-41d4-a716-446655440043 | 36 字符，使用小写 UUID v4；保持原键与原参数，有效期见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| steps | StepSpec[] | 是 | 无 | 见请求示例 | 1–50 个合法步骤，stepId 不重复，依赖须为有向无环图；见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations" -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440043' -H 'Content-Type: application/json' --data '{"steps":[{"stepId":"s1","action":"TODO_CREATE","args":{"title":"提交报告","deadline":{"type":"DATE","date":"2026-11-25"}},"dependsOn":[]}]}'
```

**成功响应** · HTTP 201 / 200

[Operation](#dto-operation)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "1",
  "phase": "READY",
  "planVersion": 1,
  "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "steps": [
    {
      "stepId": "s1",
      "status": "PENDING"
    }
  ],
  "undoAvailable": false
}
```

**常见错误**

- 409 `RESULT_PENDING`。仍有在途或未知结果。按原意图核对，勿换键重试。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `IDEMPOTENCY_CONFLICT`。同一键携带不同参数。原样重放；新意图才换键。

---

<a id="api-44"></a>
### API-44 修订写操作计划

**PUT /operations/{id}/plan** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| steps | StepSpec[] | 是 | 无 | 见请求示例 | 1–50 个合法步骤，stepId 不重复，依赖须为有向无环图；见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X PUT -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/plan" -H 'Content-Type: application/json' --data '{"revision":"1","steps":[{"stepId":"s1","action":"TODO_CREATE","args":{"title":"提交报告","deadline":{"type":"DATE","date":"2026-11-25"}},"dependsOn":[]}]}'
```

**成功响应** · HTTP 200

[Operation](#dto-operation)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "1",
  "phase": "READY",
  "planVersion": 1,
  "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "steps": [
    {
      "stepId": "s1",
      "status": "PENDING"
    }
  ],
  "undoAvailable": false
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-45"></a>
### API-45 确认执行计划

**POST /operations/{id}/confirm** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

重复确认同一计划不会重复领取步骤。

服务端先验证可信当前账号和仍有权确认的原会话，再核对本次确认凭据。若原 operationId、planVersion、fingerprint、提交的 revision 及会话均匹配已提交确认，且版本未被替换，返回原 202 受理结果，即使治理 revision 已推进。重放不会重新授权或领取步骤。未命中时按首次确认规则校验，版本或指纹不匹配返回 409 PLAN_CHANGED，版本和指纹匹配但 revision 过时返回 409 REVISION_CONFLICT。返回的原受理结果可能早于当前状态，随后用 API-46 核对。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 首次确认须等于目标最新修订；已提交确认的原样重放按本卡确认凭据规则处理，见 [§1.1](#validation-types)。 |
| planVersion | UInt32 | 是 | 无 | 1 | 1–4294967295 的 JSON 整数，须等于当前预览版本，见 [§1.1](#validation-types)。 |
| fingerprint | SHA-256 | 是 | 无 | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 64 位小写十六进制文本，使用服务器预览值，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/confirm" -H 'Content-Type: application/json' --data '{"revision":"1","planVersion":1,"fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'
```

**成功响应** · HTTP 202

[Accepted](#dto-accepted)

```json
{
  "operationId": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "2",
  "phase": "RUNNING"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `PLAN_CHANGED`。确认版本、指纹或前置条件已变化。重新预览并由用户确认。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-46"></a>
### API-46 核对操作结果

**GET /operations/{id}** · v1 · 设计中 · 普通用户，仅本人资源

只读，轮询原 ID 核对证据；UNKNOWN 不表示未提交。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/operations/550e8400-e29b-41d4-a716-446655440002"
```

**成功响应** · HTTP 200

[Operation](#dto-operation)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "1",
  "phase": "READY",
  "planVersion": 1,
  "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "steps": [
    {
      "stepId": "s1",
      "status": "PENDING"
    }
  ],
  "undoAvailable": false
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。

---

<a id="api-47"></a>
### API-47 重试未完成步骤

**POST /operations/{id}/retry** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

仅继续原授权的未完成步骤，已提交步骤跳过，未知结果先核实。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| planVersion | UInt32 | 是 | 无 | 1 | 1–4294967295 的 JSON 整数，须等于当前预览版本，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/retry" -H 'Content-Type: application/json' --data '{"revision":"2","planVersion":1}'
```

**成功响应** · HTTP 202

[Accepted](#dto-accepted)

```json
{
  "operationId": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "2",
  "phase": "RUNNING"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `RESULT_PENDING`。仍有在途或未知结果。轮询原操作 ID，勿盲重试。
- 409 `PLAN_CHANGED`。确认版本、指纹或前置条件已变化。重新预览并由用户确认。

---

<a id="api-48"></a>
### API-48 终止未领取步骤

**POST /operations/{id}/stop** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

已领取步骤进入结果核实。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/stop" -H 'Content-Type: application/json' --data '{"revision":"2"}'
```

**成功响应** · HTTP 202

[Accepted](#dto-accepted)

```json
{
  "operationId": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "2",
  "phase": "RUNNING"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-49"></a>
### API-49 预览撤销范围

**POST /operations/{id}/undo-preview** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/undo-preview" -H 'Content-Type: application/json' --data '{"revision":"5"}'
```

**成功响应** · HTTP 200

[UndoPreview](#dto-undopreview)

```json
{
  "undoBatchId": "1",
  "revision": "5",
  "fingerprint": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "steps": [
    {
      "stepId": "s1",
      "target": {
        "type": "TODO",
        "id": "101"
      },
      "summary": "撤销创建待办"
    }
  ],
  "conflicts": []
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `UNDO_CONFLICT`。撤销资格或保护条件变化。重新预览可撤销范围。
- 409 `RESULT_PENDING`。仍有在途或未知结果。轮询原操作 ID，勿盲重试。

---

<a id="api-50"></a>
### API-50 确认撤销已提交变更

**POST /operations/{id}/undo-confirm** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |
| undoBatchId | UInt32 字符串 | 是 | 无 | 1 | 1–4294967295，规范十进制字符串，须与当前有效撤销预览批次一致，见 [§1.1](#validation-types)。 |
| fingerprint | SHA-256 | 是 | 无 | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 64 位小写十六进制文本，使用服务器预览值，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/undo-confirm" -H 'Content-Type: application/json' --data '{"revision":"5","undoBatchId":"1","fingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'
```

**成功响应** · HTTP 202

[Accepted](#dto-accepted)

```json
{
  "operationId": "550e8400-e29b-41d4-a716-446655440002",
  "revision": "2",
  "phase": "RUNNING"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `UNDO_CONFLICT`。撤销资格或保护条件变化。重新预览可撤销范围。
- 409 `RESULT_PENDING`。仍有在途或未知结果。轮询原操作 ID，勿盲重试。

---

<a id="api-51"></a>
### API-51 关闭操作撤销快捷入口

**POST /operations/{id}/close-shortcut** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

删除本地聊天前调用，存在在途步骤先核实。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | UUID | 是 | 无 | 550e8400-e29b-41d4-a716-446655440002 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| revision | PosID | 是 | 无 | 1 | 必须等于目标最新修订；过时返回 409 REVISION_CONFLICT，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/operations/550e8400-e29b-41d4-a716-446655440002/close-shortcut" -H 'Content-Type: application/json' --data '{"revision":"5"}'
```

**成功响应** · HTTP 204

无响应体。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。
- 409 `RESULT_PENDING`。仍有在途或未知结果。轮询原操作 ID，勿盲重试。
- 409 `REVISION_CONFLICT`。提交修订已过时。重读资源、合并草稿后提交。

---

<a id="api-52"></a>
### API-52 查询本人通知

**GET /notifications** · v1 · 设计中 · 普通用户，仅本人资源

**请求参数**

**路径** 无专用参数。

**Query**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| unreadOnly | boolean | 否 | false | true | 仅未读；仅接受 true/false，见 [§1.1](#validation-types)。 |
| includeDismissed | boolean | 否 | false | true | 包含已关闭；仅接受 true/false，见 [§1.1](#validation-types)。 |
| cursor | string | 否 | 无 | cursor-demo | 1–2048 可见 ASCII；原样 URL 编码并复用原查询，见 [§1.1](#validation-types)、[§1.3](#validation-order)。 |
| limit | integer | 否 | 25 | 25 | 十进制整数，1–100 条，默认 25；排序见 [§1.3](#validation-order)。 |

**Header（会话 Cookie 见第 1 节）** 无专用参数。

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)及[分页排序](#validation-order)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X GET -b cookies.txt "$BASE/notifications"
```

**成功响应** · HTTP 200

Page<[Notification](#dto-notification)>，items 为数组，nextCursor 为字符串或 null。

```json
{
  "items": [
    {
      "id": "701",
      "target": {
        "type": "TODO",
        "id": "101"
      },
      "scheduledAt": "2026-11-24T10:00:00+08:00",
      "createdAt": "2026-11-24T10:00:00+08:00",
      "read": false,
      "dismissed": false,
      "summary": "待办提醒"
    }
  ],
  "nextCursor": null
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。

---

<a id="api-53"></a>
### API-53 更新通知阅读状态

**PATCH /notifications/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

按布尔值覆盖，重复提交同值安全。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 701 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| read | boolean | 否 | 保留原值 | true | 至少提供一项；仅接受 true/false，见 [§1.1](#validation-types)。 |
| dismissed | boolean | 否 | 保留原值 | false | 至少提供一项；仅接受 true/false，见 [§1.1](#validation-types)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X PATCH -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/notifications/701" -H 'Content-Type: application/json' --data '{"read":true}'
```

**成功响应** · HTTP 200

[Notification](#dto-notification)

```json
{
  "id": "701",
  "target": {
    "type": "TODO",
    "id": "101"
  },
  "scheduledAt": "2026-11-24T10:00:00+08:00",
  "createdAt": "2026-11-24T10:00:00+08:00",
  "read": true,
  "dismissed": false,
  "summary": "待办提醒"
}
```

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-54"></a>
### API-54 登记设备推送订阅

**POST /push-subscriptions** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

示例材料用真实浏览器订阅替换；同一账号设备重复登记复用。

服务端以可信当前账号、有效会话和浏览器实际订阅端点建立绑定。同一账号同一端点重登登记时复用原订阅 ID，并原子切换到当前会话，旧会话退出只处理仍归它的绑定。端点轮换时，客户端保存订阅 ID，并在原会话有效时注销旧 ID，再登记新端点。已由其他账号绑定的端点不可接管，统一返回 404 RESOURCE_NOT_FOUND。

**请求参数**

**路径** 无专用参数。

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| endpoint | string | 是 | 无 | 见请求示例 | 绝对 HTTPS URL，1–2048 个 ASCII 字符，不含首尾空格、片段或凭证；使用浏览器返回的订阅端点，保留原值。服务端仅向部署允许的推送服务发起投递；拒绝本机和私网地址，禁止跟随重定向。 |
| expirationTime | integer/null | 否 | null | null | UNIX 纪元毫秒，整数 0–253402300799999；非 null 必须晚于服务器当前时间。null 表示浏览器未声明时限。 |
| keys | PushKeys | 是 | 无 | 见请求示例 | p256dh、auth 都必填，有效 Base64url 与解码长度见 [§5.1](#validation-nested)。 |

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。嵌套对象与条件必填见 [§5.1](#validation-nested)，状态约束见 [§5.3](#validation-states)。

**调用示例**

```bash
curl -i -X POST -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/push-subscriptions" -H 'Content-Type: application/json' --data '{"endpoint":"https://push.example.invalid/demo","expirationTime":null,"keys":{"p256dh":"BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","auth":"AAAAAAAAAAAAAAAAAAAAAA"}}'
```

**成功响应** · HTTP 201 / 200

[Subscription](#dto-subscription)

```json
{
  "id": "801",
  "active": true
}
```

**常见错误**

- 404 `RESOURCE_NOT_FOUND`。订阅端点不可访问。

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

---

<a id="api-55"></a>
### API-55 注销设备推送订阅

**DELETE /push-subscriptions/{id}** · v1 · 设计中 · 普通用户，仅本人资源，校验 CSRF

仅处理当前账号与设备绑定的订阅，阻止未声明的发送。

目标订阅必须仍绑定可信当前账号和当前会话。已经切换绑定到其他会话或不可访问的订阅返回 404 RESOURCE_NOT_FOUND。

**请求参数**

**路径**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| id | PosID | 是 | 无 | 801 | 目标标识，格式及归属/状态校验见 [§1.1](#validation-types)。 |

**Query** 无专用参数。

**Header（会话 Cookie 见第 1 节）**

| 参数 | 类型 | 必填 | 默认值 | 示例 | 说明 |
|---|---|---|---|---|---|
| X-CSRF-Token | string | 是 | 无 | $CSRF | 规范 Base64url，固定 43 字符，绑定当前会话，见 [§1.2](#validation-headers)。 |

**Body** 无专用参数。

**请求校验**。遵循[§1.1](#validation-types)、[请求头与媒体类型](#validation-headers)。缺字段、格式或编码不合法返回 400；组合或状态不合法按错误码处理。

**调用示例**

```bash
curl -i -X DELETE -b cookies.txt -H "X-CSRF-Token: $CSRF" "$BASE/push-subscriptions/801"
```

**成功响应** · HTTP 204

无响应体。

**常见错误**

- 400 `INVALID_REQUEST`。请求类型、字段或游标错误。按参数表修正；游标错误时从第一页重试。
- 401 `AUTH_REQUIRED`。会话缺失或已过期。重新登录并更新 CSRF。
- 404 `RESOURCE_NOT_FOUND`。目标不存在、已不可访问或不属于当前用户。刷新列表和核对对象 ID。
- 403 `CSRF_INVALID`。写请求校验值不匹配。从当前会话重新读取 CSRF。
- 422 `VALIDATION_FAILED`。参数可解析但不满足业务约束。按 fieldErrors 修正。

## 5. 共享字段

字段名后 ? 表示可省略；类型含 null 表示可为空。分页响应的 items 按卡片引用对应类型。

<a id="dto-session"></a>
### Session

| 字段 | 类型 | 含义 |
|---|---|---|
| user | User | 当前账号 |
| expiresAt | Instant | 到期时点 |
| csrfToken | string | 后续写请求令牌 |

<a id="dto-user"></a>
### User

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 账号 |
| username | string | 登录名 |

<a id="dto-ref"></a>
### Ref

| 字段 | 类型 | 含义 |
|---|---|---|
| type | enum | TODO / CALENDAR_EVENT / CALENDAR_SERIES / NOTE / ASSET |
| id | ID | 源对象 ID |

<a id="dto-deadline"></a>
### Deadline

| 字段 | 类型 | 含义 |
|---|---|---|
| type | enum | DATE 或 DATETIME |
| date | Date | 截止日 |
| time? | Time | 仅 DATETIME 必填 |

<a id="dto-todoreminder"></a>
### TodoReminder

| 字段 | 类型 | 含义 |
|---|---|---|
| mode | enum | ENABLED / PAUSED / CLOSED |
| resumeAt? | Instant | 仅 PAUSED 必填，须为未来 |

<a id="dto-todo"></a>
### Todo

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 待办 ID |
| revision | ID | 当前修订 |
| title | string | 标题 |
| description | string/null | 描述 |
| deadline | Deadline/null | 截止 |
| priority | enum | 优先级 |
| reminder | TodoReminder | 已存配置 |
| effectiveReminderMode | enum | 当前有效控制 |
| status | enum | OPEN / COMPLETED / CANCELED |
| displayStatus | enum | status 或 OVERDUE |

<a id="dto-recurrence"></a>
### Recurrence

| 字段 | 类型 | 含义 |
|---|---|---|
| type | enum | DAILY / WEEKLY / MONTHLY |
| weekdays? | integer[] | 每周，1–7，周一为 1 |
| dayOfMonth? | integer | 每月，1–31，无该日期则跳过该月 |

<a id="dto-eventreminder"></a>
### EventReminder

| 字段 | 类型 | 含义 |
|---|---|---|
| type | enum | NONE / BEFORE_MINUTES / BEFORE_DAYS / ALL_DAY_AT_TIME |
| value? | integer | 仅定时提醒；分钟 5、15、30、60 或提前 1 天 |
| daysBefore? | integer | 仅全天必填，0 当天，1 前一天 |
| reminderTime? | Time | 仅全天必填 |

<a id="dto-event"></a>
### Event

| 字段 | 类型 | 含义 |
|---|---|---|
| id? | ID | 普通日程 ID |
| seriesId? | ID | 系列 ID |
| occurrenceNo? | ID | 稳定实例序号，与 seriesId 一起返回 |
| revision | ID | 普通记录或系列修订 |
| title | string | 标题 |
| date | Date | 实际展示日期 |
| allDay | boolean | 是否全天 |
| startTime | Time/null | 开始 |
| endTime | Time/null | 结束 |
| description | string/null | 说明 |
| location | string/null | 地点 |
| recurrence | Recurrence/null | 所属重复规则 |
| reminder | EventReminder | 当前配置 |

<a id="dto-scoperesult"></a>
### ScopeResult

| 字段 | 类型 | 含义 |
|---|---|---|
| seriesId | ID | 系列 |
| occurrenceNo | ID | 命令选中序号 |
| scope | enum | 实际请求范围 |
| revision | ID | 系列修订 |
| changed | boolean | 是否写入变更 |

<a id="dto-note"></a>
### Note

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 备忘录 |
| revision | ID | 修订 |
| title | string | 标题 |
| body | Node[] | 结构化正文 |

<a id="dto-node"></a>
### Node

| 字段 | 类型 | 含义 |
|---|---|---|
| type | enum | PARAGRAPH / LIST / CHECKLIST / ATTACHMENT |
| runs? | Run[] | 段落内容 |
| ordered? | boolean | 仅 LIST |
| items? | object[] | LIST 每项含 runs；CHECKLIST 每项含 runs 和 checked:boolean |
| assetId? | ID | 仅附件必填 |

<a id="dto-run"></a>
### Run

| 字段 | 类型 | 含义 |
|---|---|---|
| text | string | 文字 |
| marks? | enum[] | BOLD / ITALIC |
| href? | string | http 或 https 链接 |

<a id="dto-asset"></a>
### Asset

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 持久文件 |
| revision | ID | 修订 |
| fileName | string | 原始文件名 |
| mediaType | string | 媒体类型 |
| sizeBytes | integer | 字节数 |
| displayName | string | 显示名 |
| purpose | string/null | 用途 |
| keywords | string[] | 关键词 |
| inLibrary | boolean | 资料库成员 |
| uploadedAt | Instant | 上传时间 |

<a id="dto-upload"></a>
### Upload

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 暂存 ID |
| fileName | string | 原名 |
| mediaType | string | 类型 |
| sizeBytes | integer | 字节数 |
| expiresAt | Instant | 到期时点 |
| interactionId | string/null | 所属交互 |

<a id="dto-assetref"></a>
### AssetRef

| 字段 | 类型 | 含义 |
|---|---|---|
| kind | enum | RELATION / NOTE_ATTACHMENT |
| ref | Ref | 引用者 |
| inRecycleBin | boolean | 引用者是否回收 |
| revision | ID | 解除动作的目标修订 |
| relationId? | ID | 关系引用才有 |

<a id="dto-relation"></a>
### Relation

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 关系 |
| left | Ref | 规范化左端 |
| right | Ref | 规范化右端 |

<a id="dto-relationentry"></a>
### RelationEntry

| 字段 | 类型 | 含义 |
|---|---|---|
| relation? | Relation | 有效或保留的关系 |
| otherEndpointState? | enum | ACTIVE / IN_RECYCLE_BIN |
| unavailable? | object | 仅缺失提示，含 type、reason |

<a id="dto-searchhit"></a>
### SearchHit

| 字段 | 类型 | 含义 |
|---|---|---|
| ref | Ref | 跳转目标 |
| title | string | 标题 |
| summary | string/null | 摘要 |
| occurrenceNo? | ID | 重复实例序号 |

<a id="dto-recycleitem"></a>
### RecycleItem

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 回收项 ID |
| target | Ref | 原对象 |
| revision | ID | 回收项修订 |
| title | string | 标题 |
| deletedAt | Instant | 删除时点 |
| scope? | enum | 重复范围 |
| occurrenceNo? | ID | 重复范围起点 |

<a id="dto-deleted"></a>
### Deleted

| 字段 | 类型 | 含义 |
|---|---|---|
| target | Ref | 原对象 |
| revision | ID | 对象修订 |
| recycleItemId | ID | 回收项 ID |
| recycleRevision | ID | 回收项修订 |

<a id="dto-restored"></a>
### Restored

| 字段 | 类型 | 含义 |
|---|---|---|
| target | Ref | 恢复的原对象 |
| revision | ID | 恢复后的修订 |
| unavailableReferences | Ref[] | 仍不可用的引用 |

<a id="dto-purging"></a>
### Purging

| 字段 | 类型 | 含义 |
|---|---|---|
| target | Ref | 文件 |
| status | enum | DELETING |

<a id="dto-analysis"></a>
### Analysis

| 字段 | 类型 | 含义 |
|---|---|---|
| kind | enum | CANDIDATES / CLARIFICATION / NO_ACTION |
| candidates | object[] | 候选含 clientId、action、draft、可选 source；source 含 page/paragraph/row/column/excerpt 中可用字段 |
| questions | object[] | 每项含 id、text |

<a id="dto-operation"></a>
### Operation

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 操作 |
| revision | ID | 治理修订 |
| phase | enum | DRAFT / READY / RUNNING / RECONCILING / FINISHED |
| planVersion | integer | 版本 |
| fingerprint? | string | 确认绑定指纹 |
| preview? | object | 待确认摘要，细化见待确认表 |
| steps | StepResult[] | 权威步骤状态 |
| undoAvailable | boolean | 当前是否可申请撤销 |
| stopReason? | string | 停止原因 |

<a id="dto-stepresult"></a>
### StepResult

| 字段 | 类型 | 含义 |
|---|---|---|
| stepId | string | 步骤 |
| status | enum | PENDING / RUNNING / SUCCEEDED / FAILED / UNKNOWN / SKIPPED |
| evidence? | enum | COMMITTED / NOT_COMMITTED / UNKNOWN |
| reason? | string | 失败/跳过原因 |
| output? | object | 提交结果含 target、revision、changed |

<a id="dto-accepted"></a>
### Accepted

| 字段 | 类型 | 含义 |
|---|---|---|
| operationId | ID | 轮询 ID |
| revision | ID | 最新治理修订 |
| phase | enum | 当前阶段 |

<a id="dto-undopreview"></a>
### UndoPreview

| 字段 | 类型 | 含义 |
|---|---|---|
| undoBatchId | ID | 撤销确认批次 |
| revision | ID | 当前修订 |
| fingerprint | string | 撤销绑定指纹 |
| steps | object[] | 每项含 stepId、target、summary |
| conflicts | object[] | 每项含 target、code、message |

<a id="dto-notification"></a>
### Notification

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 通知 |
| target | Ref | 业务来源 |
| occurrenceNo? | ID | 重复实例 |
| scheduledAt | Instant | 业务触发时点 |
| createdAt | Instant | 逻辑通知生成时点 |
| read | boolean | 已读 |
| dismissed | boolean | 已关闭 |
| summary | string | 站内显示信息 |
| deliveries? | object[] | 渠道项含 state 与可选 attemptedAt |

<a id="dto-subscription"></a>
### Subscription

| 字段 | 类型 | 含义 |
|---|---|---|
| id | ID | 订阅 ID |
| active | boolean | 是否有效 |

<a id="dto-conflicts"></a>
### Conflicts

| 字段 | 类型 | 含义 |
|---|---|---|
| conflicts | Event[] | 当天重叠日程 |

<a id="dto-attachmentremoved"></a>
### AttachmentRemoved

| 字段 | 类型 | 含义 |
|---|---|---|
| target | Ref | 原备忘录 |
| revision | ID | 最新修订 |
| changed | boolean | 正文是否发生变化 |

<a id="validation-nested"></a>
### 5.1 嵌套请求字段

每行点名必填字段、可选字段及允许值。对象仅接受列出的字段，数组元素不得为 null。Date、Time、Instant、PosID、UUID 等按[通用字段校验](#validation-types)。

| 结构 | 字段约束 |
|---|---|
| Deadline | type 必填，DATE（仅日期）或 DATETIME（日期加时间）。date 必填 Date，允许历史。DATETIME 必填 time（Time），DATE 禁止带 time。待办 deadline 可用 null 清空；无截止不会生成截止提醒。 |
| TodoReminder | mode 必填，ENABLED（启用）、PAUSED（暂停至恢复时点）、CLOSED（关闭）。仅 PAUSED 允许且必填 resumeAt（Instant，严格晚于服务端当前时间）；其余分支省略 resumeAt。 |
| Recurrence | type 必填，DAILY（每天）、WEEKLY（每周）、MONTHLY（每月）。DAILY 禁止其余字段。WEEKLY 可给 weekdays，1–7 个不重复整数，各为 1–7（周一至周日），省略时取创建业务日星期；禁止 dayOfMonth。MONTHLY 必填 dayOfMonth，整数 1–31；禁止 weekdays，遇无该日的月份跳过。无结束日期。 |
| EventReminder | type 必填。NONE（关闭）无其他字段。BEFORE_MINUTES（定时提前若干分钟）必填 value，整数 5/15/30/60；BEFORE_DAYS（定时提前一天）必填 value=1。两个定时分支禁止 daysBefore、reminderTime。ALL_DAY_AT_TIME（全天指定时刻）必填 daysBefore=0 或 1 及 reminderTime（Time），禁止 value。按实际展示日期减天数，取 UTC+8 时刻。 |
| Ref | type 与 id 必填。type 为 TODO（待办）、CALENDAR_EVENT（普通日程）、CALENDAR_SERIES（稳定系列锚点）、NOTE（备忘录）、ASSET（持久文件）；id 为 PosID。跨账号或失效引用按 §1.1。关系不得以移动后实例代替稳定系列锚点。 |
| Calendar.exclude | 可选；仅允许 {id:PosID} 或 {seriesId:PosID, occurrenceNo:PosID}，两分支互斥。须引用本人活动日程。 |
| newAssets[] | 每项使用 API-28 Body 的全部字段与默认值，uploadId 必填且同批不重复。子项无需单独的 Idempotency-Key。整单 newAssets 非空时外层头必填。 |
| Note.body / Node | Node[] 最多 500 个顶层节点；累计 Run 文本最多 20,000 码点，附件最多 20 个并以 assetId 去重。PARAGRAPH 必填 runs；LIST 必填 ordered:boolean 与 items；CHECKLIST 必填 items，每项还须 checked:boolean；ATTACHMENT 必填 assetId:PosID，并核验本人可用持久文件。其他分支专有字段不允许混传。列表 items 为 1–200 项，非嵌套。每项 runs 必填。 |
| Run | text 必填，0–20,000 码点，保留原有空格，累计限于正文总量；runs 为 0–200 项。marks 可选，最多 2 项且不重复，仅 BOLD（粗体）、ITALIC（斜体）。href 可选，1–2048 字符，有效绝对 http/https URL，禁止嵌入凭证、控制字符及首尾空格。清单勾选仅改变正文。 |
| AnalysisInput | type 必填，TEXT（粘贴文字）、UPLOAD（临时文件）、ASSET（持久文件）三选一。TEXT 必填 text，去首尾空白后 1–20,000 码点，可多行；其余分支分别必填 uploadId:UUID 或 assetId:PosID。禁止同时传其他分支字段。 |
| StepSpec | stepId、action、args、dependsOn 均必填。stepId 匹配 ^[A-Za-z][A-Za-z0-9_-]{0,31}$，计划内唯一。action 仅下方固定动作编码；args 是对应动作的对象，拒绝未知属性。dependsOn 是满足 stepId 规则的不重复数组，最多 49 项，[] 表示无依赖；须存在于当前版本且无自依赖、无循环。 |
| 步骤结果引用 | 只在动作支持目标结果引用时，使用 {fromStep,output}；二者必填。fromStep 为已声明的先决步骤 ID，output 固定为 target。不得用任意对象代替字面 ID 或修改已确认参数。使用结果引用作为 id 或 seriesId 时，省略 revision。服务端从同一已声明依赖的已提交凭据同时绑定目标与对象修订，确认快照绑定此依赖，不接受客户端另传修订覆盖。直接使用 ID 时则必须提供 revision。依赖未提交、输出类型不匹配、缺少对象修订或实际对象修订已变化时，按治理规则核实或停止受影响步骤，不能用当前修订替代。关系端点及解除关系的结果引用按其无 revision 的参数规则处理。 |
| PushKeys | p256dh、auth 均必填且是无补位的规范 Base64url。从浏览器订阅原样读取。p256dh 解码 65 字节（87 字符），auth 解码 16 字节（22 字符）。不可裁剪，非法返回 400。 |
| scope | THIS（仅本次）、THIS_AND_FOLLOWING（本次及以后）、ENTIRE_SERIES（整个系列）。使用原序号；THIS 更新不得带 recurrence；其他范围如传 recurrence，必须为合法重复对象，不可传 null。 |

<a id="validation-upload"></a>
### 5.2 上传与解析白名单

API-25 每次只接收一个名为 file 的必填 multipart 文件 part，字节数 1–10,485,760（10 MiB），同时可选 interactionId。每个会话同时最多 5 个暂存文件、合计最多 50 MiB。 未晋升暂存文件闲置最长 24 小时。客户端扩展名比对不区分大小写，服务器核对扩展名和实际文件结构。浏览器未标媒体类型或报 application/octet-stream 时以检测后的类型为准。格式不符返回 415 UNSUPPORTED_FILE_TYPE，超过容量返回 413 INPUT_TOO_LARGE。

| 扩展名 | 媒体类型 | 附加限制 |
|---|---|---|
| .pdf | application/pdf | 最多 30 页，扫描 OCR 最多 10 页。 |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 必须是有效 DOCX，最多 2,000 个段落或表格行，提取最多 50,000 字符。 |
| .png | image/png | 不超过 12 MP，每边 <8,000 像素。 |
| .jpg / .jpeg | image/jpeg | 不超过 12 MP，每边 <8,000 像素。 |

简单表格只接受支持文档内可解析的表格，最多 20 列及 200 行。不支持工作簿作为独立分析文件。已支持类型的损坏或加密导致无法分析时返回 422 PARSE_FAILED。预览是否内联仍由服务端安全媒体白名单决定。

<a id="validation-states"></a>
### 5.3 命令状态与组合约束

| 对象或命令 | 允许的流转与失败 |
|---|---|
| 待办状态 | OPEN → COMPLETED 用 COMPLETE；OPEN → CANCELED 用 CANCEL；两个终态 → OPEN 用 REOPEN。同一动作的目标状态已达到时，在修订校验后可无变更返回。两个终态之间先重开，其他不允许的动作返回 422 INVALID_TRANSITION。OVERDUE 仅展示，不可写入。软删对象通过回收箱恢复。 |
| 日程写入 | 定时必填 startTime 和 endTime，均为本地同日时刻，endTime ≥ startTime；相等时为空区间，不报重叠。全天 startTime/endTime 省略或 null。变更类型后合并态必须满足所选分支，必要时在同一补丁清空/补齐旧时刻并调整提醒。普通日程 PATCH 不改成重复系列。 |
| 引用与文件 | 活动端点创建关系；已存在的同一规范化端点对返回原记录。持久文件 ACTIVE → IN_RECYCLE_BIN → ACTIVE 或 DELETING，最后不可恢复。未解除的有效引用阻止文件软删与永久删除。 |
| 操作计划 | DRAFT（草稿）或 READY（待确认）可修订预览，READY 可确认；RUNNING（执行中）可终止后续领取并核实；RECONCILING（核实中）先确认原结果；FINISHED（当前执行结束）按原计划授权、失败分类与依赖判断是否可重试。撤销预览须具备撤销资格及安全子集。停止、重试和确认均校验修订，状态改变和授权撤回按治理契约处理。 |
| 步骤状态 | PENDING（待执行）、RUNNING（已领取执行）、SUCCEEDED（成功）、FAILED（明确失败）、UNKNOWN（结果待核实）、SKIPPED（未执行）。核实证据为 COMMITTED、NOT_COMMITTED、UNKNOWN；只允许复用原身份重试明确未提交的合法步骤。 |
| 通知更新 | read 和 dismissed 至少出现一个，值为 boolean；允许同值重放，不能借更新通知改动事项状态。 |
| 永久删除 | confirmed 必须为 true，且仅本人授权的回收项可执行。false、缺失或非布尔值不能触发清除。 |


### Agent 固定动作与参数

| action | args |
|---|---|
| TODO_CREATE / TODO_UPDATE / TODO_DELETE | 创建传待办业务字段；更新传 id、revision、changes；删除传 id、revision。 |
| TODO_SET_STATE | id、revision、action（COMPLETE / CANCEL / REOPEN）。 |
| CALENDAR_CREATE / CALENDAR_UPDATE / CALENDAR_DELETE | 创建传日程业务字段；普通修改或删除传 id、revision；系列传 seriesId、occurrenceNo、scope、revision；更新另传 changes。 |
| NOTE_CREATE / NOTE_UPDATE / NOTE_DELETE | 创建传备忘录字段；更新传 id、revision、changes；删除传 id、revision。 |
| ASSET_SAVE / ASSET_UPDATE | 保存传 uploadId 和文件业务字段；更新传 id、revision、changes。幂等由治理绑定到步骤。 |
| RELATION_CREATE / RELATION_DELETE | 创建传 left、right；解除传 id。 |

先建后改示例见下方。使用结果引用时，动作表中的 revision 按 §5.1 的步骤结果引用规则处理。

```json
{
  "steps": [
    {
      "stepId": "create",
      "action": "TODO_CREATE",
      "args": {
        "title": "提交报告"
      },
      "dependsOn": []
    },
    {
      "stepId": "update",
      "action": "TODO_UPDATE",
      "args": {
        "id": {
          "fromStep": "create",
          "output": "target"
        },
        "changes": {
          "title": "提交最终报告"
        }
      },
      "dependsOn": [
        "create"
      ]
    }
  ]
}
```

Agent 的实体、文件保存和关联分别按固定用例执行，通过依赖绑定。永久删除仅用户界面可发起。结果核实按原操作，提交未知期间不得以超时推断未提交。独立执行、授权撤回和撤销安全子集以原治理契约为准。

## 6. 待确认与维护

| 项目 | 待确认内容 | 负责人 |
|---|---|---|
| 部署信息 | 基址、会话有效期、测试账号供给 | 部署与后端 |
| Agent 展示 | preview 内部差异字段、各格式源位置精度、撤销冲突附加详情及计划上限的负载验证 | Agent 后端与前端 |
| 通知渠道 | deliveries.state 最终枚举和 Worker 证据回传协议，初版只用已有服务端证据 | 通知后端 |
| 文件响应 | 内联 MIME 白名单、下载文件名编码与测试样本 | 文件后端与测试 |
| 限流和重放 | 配额、429 策略、幂等键长度及保留期。当前无已发布配额 | 后端与部署 |
| 正式实现对照 | 逐条校验 Controller 输出字段、空值、状态码、调用流程及跨账号隔离，真实环境验证样例 | 后端与测试 |

废弃接口保留记录并标注替代路径及停用日期。

| 日期 | 文档版本 | 变化 | 影响 |
|---|---|---|---|
| 2026-11-24 | 1.0 | 补充首期清单和详情卡，纳入全天提醒方案 B | 全部 v1 接口，待实现联调 |
| 2026-11-24 | 1.1 | 补齐所有接口请求字段、嵌套结构、状态机、文件白名单、请求头与幂等校验 | 全部 v1 端点；新增输入限制待实现联调 |
