/**
 * 本地静态数据（模拟服务端返回）。
 * 字段命名对齐《数据库设计与接口文档》：entries / calendar_event_details /
 * todo_details / note_details / tags / entry_tags / ai_tasks / ai_task_steps /
 * ai_task_changes。
 * 后续接入真实接口时，只需替换 src/api/index.js 中的取数实现。
 */

export const currentUser = {
  id: 'user-1',
  name: '林悦',
  short_name: '林',
  workspace: '个人工作空间',
  email: 'lin.yue@company.com',
}

export const users = [currentUser]

const tagSeed = [
  { id: 'tag-work', name: '工作', color: '#4B719C' },
  { id: 'tag-personal', name: '个人', color: '#5F8774' },
  { id: 'tag-idea', name: '灵感', color: '#84729E' },
]

export const tags = tagSeed.map((tag) => ({
  id: tag.id,
  user_id: currentUser.id,
  name: tag.name,
  color: tag.color,
  created_at: '2026-05-01T09:00:00+08:00',
}))

/** 简易种子构造：按日生成条目，附带详情与标签关系 */
const seed = []
const entryTags = []

const pad = (value) => String(value).padStart(2, '0')
const today = new Date()
/** 设计稿里的「18 日」即运行当天，其余日期按相对天数平移，保证日历/周视图始终有内容 */
const DAY_SHIFT = today.getDate() - 18
const dateForDay = (day) => {
  const date = new Date(today.getFullYear(), today.getMonth(), day + DAY_SHIFT)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 待办优先级：与待办中心筛选选项对齐（紧急 / 重要 / 常规 / 可延后），按种子序循环分布 */
const PRIORITY_CYCLE = ['important', 'normal', 'urgent', 'normal', 'later', 'normal', 'important']

/** 设计稿只保留 工作 / 个人 / 灵感 三个标签 */
const TAG_ALIAS = {
  'tag-design': 'tag-idea',
  'tag-research': 'tag-work',
  'tag-collab': 'tag-work',
  'tag-priority': 'tag-work',
  'tag-schedule': 'tag-work',
}

const pushEntry = ({ day, type, title, description = '', completed, start, end, due, content, tags: tagIds }) => {
  const id = `entry-${seed.length + 1}`
  const date = dateForDay(day)
  seed.push({
    entry: {
      id,
      user_id: currentUser.id,
      type,
      title,
      description,
      completion_status: type === 'todo' ? (completed ? 'completed' : 'pending') : null,
      deleted_at: null,
      created_via: 'manual',
      version: type === 'todo' ? (seed.length % 5) + 1 : 1,
      created_at: `${date}T${type === 'note' ? '10:42' : '08:00'}:00+08:00`,
      updated_at: `${date}T${type === 'note' ? '10:42' : '08:00'}:00+08:00`,
    },
    calendar_event_details:
      type === 'event'
        ? {
            entry_id: id,
            start_at: `${date}T${start}:00+08:00`,
            end_at: `${date}T${end}:00+08:00`,
            is_all_day: false,
            timezone: 'Asia/Shanghai',
            recurrence_rule: null,
            series_id: null,
            reminder_minutes: 15,
          }
        : null,
    todo_details:
      type === 'todo'
        ? {
            entry_id: id,
            due_at: `${date}T${due || '18:00'}:00+08:00`,
            completed_at: completed ? `${date}T10:00:00+08:00` : null,
            priority: PRIORITY_CYCLE[seed.length % PRIORITY_CYCLE.length],
          }
        : null,
    note_details:
      type === 'note'
        ? {
            entry_id: id,
            content_json: { type: 'doc', text: content || description },
            content_text: content || description,
          }
        : null,
  })

  for (const tag_id of tagIds) {
    entryTags.push({
      entry_id: id,
      tag_id: TAG_ALIAS[tag_id] || tag_id,
      created_at: `${date}T08:00:00+08:00`,
    })
  }
}

/* 6 月：日程 */
pushEntry({ day: 1, type: 'event', title: '月度计划会', description: '确认六月目标与关键里程碑', start: '09:30', end: '10:30', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 2, type: 'todo', title: '梳理六月项目目标', description: '把季度目标拆到每周行动项', completed: true, due: '18:00', tags: ['tag-work'] })
pushEntry({ day: 3, type: 'event', title: '用户访谈', description: '访谈 3 位活跃用户，验证新版工作台流程', start: '10:00', end: '11:00', tags: ['tag-work', 'tag-research'] })
pushEntry({ day: 4, type: 'note', title: '访谈要点', description: '记录访谈中的高频诉求', content: '用户更关注快速录入与跨端同步；希望在日历上直接看到待办完成情况。', tags: ['tag-idea'] })
pushEntry({ day: 5, type: 'event', title: '设计走查', description: '走查月历视图与条目编辑交互', start: '15:00', end: '16:00', tags: ['tag-work', 'tag-design'] })

pushEntry({ day: 8, type: 'event', title: '项目周会', description: '同步本周进度与风险', start: '09:30', end: '10:30', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 9, type: 'todo', title: '提交交互方案', description: '输出可评审的交互流程与状态说明', completed: true, due: '17:00', tags: ['tag-work', 'tag-design'] })
pushEntry({ day: 10, type: 'event', title: '需求对齐会', description: '对齐 AI 任务确认与撤销规则', start: '14:00', end: '15:00', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 11, type: 'note', title: '竞品分析思路', description: '从日程、待办、备忘三条线拆解', content: '重点看信息密度、录入效率与 AI 辅助的边界；避免把确认步骤做成负担。', tags: ['tag-idea'] })
pushEntry({ day: 12, type: 'event', title: '阶段复盘', description: '复盘六月前两周节奏与交付质量', start: '16:00', end: '17:00', tags: ['tag-work', 'tag-collab'] })

pushEntry({ day: 15, type: 'event', title: '项目周会', description: '确认本周重点与协作分工', start: '09:30', end: '10:30', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 15, type: 'todo', title: '梳理本周重点', description: '明确本周必须完成的三件事', completed: true, due: '18:00', tags: ['tag-work'] })
pushEntry({ day: 16, type: 'event', title: '用户访谈', description: '针对待办流程做二次访谈', start: '10:00', end: '11:00', tags: ['tag-work', 'tag-research'] })
pushEntry({ day: 16, type: 'note', title: '访谈记录', description: '整理访谈原话与观察', content: '多数用户希望待办可以直接拖进日历；对自动生成摘要的接受度较高。', tags: ['tag-idea'] })
pushEntry({ day: 17, type: 'event', title: '设计走查', description: '走查抽屉与悬浮预览细节', start: '15:00', end: '16:00', tags: ['tag-work', 'tag-design'] })
pushEntry({ day: 17, type: 'todo', title: '归档走查意见', description: '把走查问题归并到设计待办', completed: true, due: '18:00', tags: ['tag-work'] })
pushEntry({ day: 17, type: 'note', title: '走查问题清单', description: '按优先级记录待修问题', content: '1. 日期胶囊状态不够明确；2. 抽屉时间字段对齐；3. 悬浮预览层级需确认。', tags: ['tag-idea'] })
pushEntry({ day: 18, type: 'event', title: '产品方案评审', description: '对齐工作台新版方案，确认核心流程与交互细节', start: '14:00', end: '15:00', tags: ['tag-work', 'tag-design', 'tag-priority'] })
pushEntry({ day: 18, type: 'todo', title: '整理用户访谈记录', description: '提炼高频问题，补充到评审材料中', due: '18:00', tags: ['tag-work', 'tag-research'] })
pushEntry({ day: 18, type: 'note', title: '评审前确认数据口径', description: '统一日程、待办与备忘的统计方式', content: '统计口径按自然月；已完成待办以 completed_at 落在区间内为准。', tags: ['tag-idea'] })
pushEntry({ day: 19, type: 'event', title: '需求沟通', description: '确认下一阶段需求范围', start: '14:00', end: '14:30', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 19, type: 'event', title: '项目周复盘', description: '复盘本周交付与阻塞项', start: '16:00', end: '17:00', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 19, type: 'todo', title: '提交设计交付物', description: '整理组件与页面标注', due: '20:00', tags: ['tag-work', 'tag-design'] })

pushEntry({ day: 22, type: 'event', title: '项目周会', description: '同步排期与依赖', start: '09:30', end: '10:30', tags: ['tag-work'] })
pushEntry({ day: 23, type: 'todo', title: '完成可用性测试', description: '邀请 5 位用户完成关键任务', due: '18:00', tags: ['tag-work', 'tag-research'] })
pushEntry({ day: 24, type: 'event', title: '研发排期会', description: '确认开发排期与联调节点', start: '14:00', end: '15:00', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 25, type: 'note', title: '新功能灵感', description: '记录 AI 工作台的下一步想法', content: '支持把会议纪要一键拆成待办，并保留来源链接。', tags: ['tag-idea'] })
pushEntry({ day: 26, type: 'event', title: '设计分享', description: '分享本月设计沉淀', start: '15:00', end: '16:00', tags: ['tag-work', 'tag-design'] })
pushEntry({ day: 29, type: 'event', title: '月度复盘', description: '复盘六月目标完成情况', start: '10:00', end: '11:00', tags: ['tag-work'] })
pushEntry({ day: 30, type: 'todo', title: '整理月度总结', description: '输出六月总结与七月计划', due: '18:00', tags: ['tag-personal'] })
pushEntry({ day: 30, type: 'note', title: '七月规划草稿', description: '先列出七月关键目标', content: '七月聚焦清单视图、AI 计划编辑与撤销回滚的完整体验。', tags: ['tag-personal', 'tag-idea'] })

/* 追加数据（追加在末尾，保持上面既有 entry-1 ~ entry-31 编号不变） */
pushEntry({ day: 18, type: 'todo', title: '确认下周评审会议室', description: '锁定 2 号会议室并同步参会人', due: '16:00', tags: ['tag-work', 'tag-collab'] })
pushEntry({ day: 18, type: 'todo', title: '补充竞品截图到方案', description: '补齐三个竞品的月历视图截图', due: '19:00', tags: ['tag-design'] })
pushEntry({ day: 19, type: 'todo', title: '给用户发送访谈感谢邮件', description: '附上访谈纪要链接', due: '11:00', tags: ['tag-research'] })
pushEntry({ day: 20, type: 'todo', title: '整理本周风险清单', description: '标注阻塞项与责任人', due: '17:00', tags: ['tag-work'] })
pushEntry({ day: 21, type: 'todo', title: '更新团队周报', description: '汇总本周交付与下周计划', due: '18:00', tags: ['tag-work'] })
pushEntry({ day: 21, type: 'todo', title: '预约下月用户回访', description: '挑选 3 位活跃用户', due: '12:00', tags: ['tag-research'] })
pushEntry({ day: 28, type: 'note', title: '设计分享提纲：信息密度、录入效率与 AI 辅助边界的三点思考', description: '准备月末设计分享的框架', content: '从信息密度、录入效率与 AI 边界三个角度分享本月设计沉淀。', tags: ['tag-design', 'tag-idea'] })

export const entries = seed.map((item) => item.entry)
export const calendar_event_details = seed.filter((item) => item.calendar_event_details).map((item) => item.calendar_event_details)
export const todo_details = seed.filter((item) => item.todo_details).map((item) => item.todo_details)
export const note_details = seed.filter((item) => item.note_details).map((item) => item.note_details)
export { entryTags }

/** 概览：由同一份条目数据按区间实时统计，避免各处硬编码 */
const entryDateOf = (item) => {
  if (item.calendar_event_details) return item.calendar_event_details.start_at.slice(0, 10)
  if (item.todo_details) return item.todo_details.due_at.slice(0, 10)
  return item.entry.created_at.slice(0, 10)
}

export const buildOverview = ({ from, to } = {}) => {
  const inRange = seed.filter((item) => {
    if (item.entry.deleted_at) return false
    const key = entryDateOf(item)
    if (from && key < from) return false
    if (to && key > to) return false
    return true
  })
  const todos = inRange.filter((item) => item.entry.type === 'todo')
  return {
    range_label: '本月概览',
    event_count: inRange.filter((item) => item.entry.type === 'event').length,
    todo_count: todos.length,
    note_count: inRange.filter((item) => item.entry.type === 'note').length,
    todo_completed: todos.filter((item) => item.entry.completion_status === 'completed').length,
  }
}

/** AI 任务：等待确认状态，含步骤与变更预览 */
export const ai_tasks = [
  {
    id: 'ai-task-1',
    user_id: currentUser.id,
    conversation_id: 'conversation-1',
    instruction: '把明天的需求沟通和项目周复盘都后移一小时，先检查冲突。',
    status: 'awaiting_confirmation',
    plan_json: {
      steps: [
        { step_no: 1, operation: '查找目标日程' },
        { step_no: 2, operation: '检查时间冲突' },
        { step_no: 3, operation: '更新日程时间' },
      ],
    },
    confirmed_at: null,
    started_at: `${dateForDay(18)}T10:45:00+08:00`,
    finished_at: null,
    undo_status: null,
    error_summary: null,
    created_at: `${dateForDay(18)}T10:45:00+08:00`,
  },
]

export const ai_task_steps = [
  {
    id: 'ai-step-1',
    ai_task_id: 'ai-task-1',
    step_no: 1,
    operation: '查找目标日程',
    tool: '日程查询',
    summary: '已找到 2 项目标日程，保留原有时长与参与人。',
    input_json: { date: '2026-06-19' },
    result_json: { matched: 2 },
    status: 'completed',
    error_code: null,
    started_at: '2026-06-18T10:45:10+08:00',
    finished_at: '2026-06-18T10:45:12+08:00',
  },
  {
    id: 'ai-step-2',
    ai_task_id: 'ai-task-1',
    step_no: 2,
    operation: '检查时间冲突',
    tool: '时间检查',
    summary: '调整后无日程重叠，未占用你的专注时间。',
    input_json: { shifted_minutes: 60 },
    result_json: { conflicts: 0 },
    status: 'completed',
    error_code: null,
    started_at: '2026-06-18T10:45:12+08:00',
    finished_at: '2026-06-18T10:45:14+08:00',
  },
  {
    id: 'ai-step-3',
    ai_task_id: 'ai-task-1',
    step_no: 3,
    operation: '更新日程时间',
    tool: '日程修改',
    summary: '此步骤将修改 2 项日程，未经你的确认，不会写入任何数据。',
    input_json: { entries: ['entry-22', 'entry-23'] },
    result_json: null,
    status: 'awaiting_confirmation',
    error_code: null,
    started_at: null,
    finished_at: null,
  },
]

export const ai_task_changes = [
  {
    id: 'ai-change-1',
    ai_task_id: 'ai-task-1',
    step_id: 'ai-step-3',
    target_entry_id: 'entry-22',
    operation: 'reschedule',
    before_json: { start_at: `${dateForDay(19)}T14:00:00+08:00`, end_at: `${dateForDay(19)}T14:30:00+08:00` },
    after_json: { start_at: `${dateForDay(19)}T15:00:00+08:00`, end_at: `${dateForDay(19)}T15:30:00+08:00` },
    applied_version: null,
    undo_status: null,
  },
  {
    id: 'ai-change-2',
    ai_task_id: 'ai-task-1',
    step_id: 'ai-step-3',
    target_entry_id: 'entry-23',
    operation: 'reschedule',
    before_json: { start_at: `${dateForDay(19)}T16:00:00+08:00`, end_at: `${dateForDay(19)}T17:00:00+08:00` },
    after_json: { start_at: `${dateForDay(19)}T17:00:00+08:00`, end_at: `${dateForDay(19)}T18:00:00+08:00` },
    applied_version: null,
    undo_status: null,
  },
]

/* ------------------------------------------------------------------ */
/* 待办清单（文件夹结构）：接口文档暂无独立表，这里用独立集合承载分组关系 */
/* ------------------------------------------------------------------ */

export const todo_lists = [
  { id: 'list-work', name: '工作清单', color: '#4B719C', icon: 'folder', sort_order: 1 },
  { id: 'list-project', name: '产品项目', color: '#84729E', icon: 'folder', sort_order: 2 },
  { id: 'list-personal', name: '个人计划', color: '#5F8774', icon: 'folder', sort_order: 3 },
  { id: 'list-someday', name: '稍后处理', color: '#A4864F', icon: 'folder', sort_order: 4 },
]

const listRelation = {
  'list-work': ['entry-19', 'entry-23', 'entry-2', 'entry-32', 'entry-35'],
  'list-project': ['entry-25', 'entry-30', 'entry-33', 'entry-7'],
  'list-personal': ['entry-12', 'entry-36', 'entry-34'],
  'list-someday': ['entry-16', 'entry-37'],
}

export const todo_list_items = Object.entries(listRelation).flatMap(([todo_list_id, ids]) =>
  ids.map((entry_id, index) => ({ todo_list_id, entry_id, sort_order: index + 1 })),
)

/* ------------------------------------------------------------------ */
/* 笔记块（飞书风格块编辑器）                                          */
/* ------------------------------------------------------------------ */

const blocksFor = (noteId, items) =>
  items.map((item, index) => ({
    id: `${noteId}-block-${index + 1}`,
    note_entry_id: noteId,
    block_type: 'text',
    content: '',
    checked: null,
    indent: 0,
    sort_order: index + 1,
    ...item,
  }))

export const note_blocks = [
  ...blocksFor('entry-4', [
    { block_type: 'heading', content: '访谈要点' },
    { block_type: 'text', content: '本轮访谈了 3 位活跃用户，核心诉求集中在「快速录入」与「跨端同步」两件事上。' },
    { block_type: 'quote', content: '“如果能在日历里直接拖拽待办，我就不用两个 App 来回切了。”' },
    { block_type: 'todo', content: '整理三位用户的访谈原话', checked: true },
    { block_type: 'todo', content: '补充跨端同步的验证问题', checked: false },
    { block_type: 'todo', content: '输出访谈摘要给到设计同学', checked: false },
    { block_type: 'divider' },
    { block_type: 'text', content: '下一步：把高频问题合并进评审材料，避免同名问题重复出现。' },
  ]),
  ...blocksFor('entry-9', [
    { block_type: 'heading', content: '竞品分析思路' },
    { block_type: 'text', content: '从日程、待办、备忘三条线拆解，重点看信息密度与录入效率。' },
    { block_type: 'bullet', content: '月历视图：一屏能看到多少条信息' },
    { block_type: 'bullet', content: '录入路径：新建条目需要几步' },
    { block_type: 'bullet', content: 'AI 辅助：确认步骤是否成为负担' },
    { block_type: 'todo', content: '整理三款竞品的核心差异表', checked: false },
  ]),
  ...blocksFor('entry-14', [
    { block_type: 'heading', content: '访谈记录' },
    { block_type: 'text', content: '多数用户希望待办可以直接拖进日历；对自动生成摘要的接受度较高。' },
    { block_type: 'todo', content: '把原话按主题归档', checked: false },
    { block_type: 'todo', content: '标记可复用的设计建议', checked: false },
  ]),
  ...blocksFor('entry-17', [
    { block_type: 'heading', content: '走查问题清单' },
    { block_type: 'text', content: '按优先级记录本次走查发现的问题。' },
    { block_type: 'todo', content: '日期胶囊状态不够明确', checked: true },
    { block_type: 'todo', content: '抽屉时间字段对齐', checked: false },
    { block_type: 'todo', content: '悬浮预览层级需要确认', checked: false },
  ]),
  ...blocksFor('entry-20', [
    { block_type: 'heading', content: '评审前确认数据口径' },
    { block_type: 'text', content: '统计口径按自然月；已完成待办以 completed_at 落在区间内为准。' },
    { block_type: 'quote', content: '口径不一致会让概览数字和清单数字对不上，评审时很容易被问到。' },
  ]),
  ...blocksFor('entry-27', [
    { block_type: 'heading', content: '新功能灵感' },
    { block_type: 'text', content: '支持把会议纪要一键拆成待办，并保留来源链接。' },
    { block_type: 'todo', content: '画出「纪要 → 待办」的流程图', checked: false },
  ]),
  ...blocksFor('entry-31', [
    { block_type: 'heading', content: '七月规划草稿' },
    { block_type: 'text', content: '七月聚焦清单视图、AI 计划编辑与撤销回滚的完整体验。' },
    { block_type: 'todo', content: '补齐清单视图的交互说明', checked: false },
    { block_type: 'todo', content: '和研发确认撤销回滚的实现成本', checked: false },
  ]),
  ...blocksFor('entry-38', [
    { block_type: 'heading', content: '设计分享提纲' },
    { block_type: 'text', content: '从信息密度、录入效率与 AI 边界三个角度分享本月设计沉淀。' },
    { block_type: 'bullet', content: '信息密度：一屏能承载多少条信息' },
    { block_type: 'bullet', content: '录入效率：三次点击内完成新建' },
    { block_type: 'bullet', content: 'AI 边界：先给计划，再执行' },
  ]),
]

/* ------------------------------------------------------------------ */
/* AI 助手浮窗内容                                                      */
/* ------------------------------------------------------------------ */

export const ai_pending_tasks = [
  { id: 'ai-1', title: '把「项目周复盘」推迟 30 分钟' },
  { id: 'ai-2', title: '给「用户访谈」添加提前提醒' },
]

export const ai_queued_tasks = [{ id: 'ai-3', title: '生成会议纪要草稿' }]

export const ai_messages = [
  { id: 'msg-1', role: 'user', text: '把今天的待办整理一下，顺便看看有没有冲突的日程。' },
  {
    id: 'msg-2',
    role: 'ai',
    text: '今天有 3 项待办、2 个日程。14:00 的产品方案评审与「提交设计交付物」时间接近，建议把交付物提前到 11:00 前完成。',
  },
]

export const countEntries = () => ({
  calendar: entries.filter((entry) => entry.type === 'event' && !entry.deleted_at).length,
  todos: entries.filter((entry) => entry.type === 'todo' && !entry.deleted_at).length,
  notes: entries.filter((entry) => entry.type === 'note' && !entry.deleted_at).length,
})
