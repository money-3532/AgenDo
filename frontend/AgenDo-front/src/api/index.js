/**
 * 取数层：页面与组件只依赖这里暴露的函数。
 * 当前全部返回本地静态数据（模拟 Promise），后续替换为真实 fetch 即可。
 */
import {
  currentUser,
  entries,
  calendar_event_details,
  todo_details,
  note_details,
  tags,
  entryTags,
  buildOverview,
  ai_tasks,
  ai_task_steps,
  ai_task_changes,
  todo_lists,
  todo_list_items,
  note_blocks,
  ai_pending_tasks,
  ai_queued_tasks,
  ai_messages,
  countEntries,
} from './mock/agendo'
import { TODAY_KEY, formatDateCN } from '@/utils/date'

/** mock 数据迁移：确保所有 entry 都有 related_refs / imported_dates / imported_to_todos 字段 */
for (const entry of entries) {
  if (entry.related_refs === undefined) entry.related_refs = []
  if (!Array.isArray(entry.imported_dates)) entry.imported_dates = []
  if (entry.imported_to_todos === undefined) entry.imported_to_todos = false
}

const delay = (payload, ms = 120) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(payload)), ms)
  })

const findDetail = (list, key, value) => list.find((item) => item[key] === value)

const entryDateKey = (entry) => {
  if (entry.type === 'event') return findDetail(calendar_event_details, 'entry_id', entry.id)?.start_at?.slice(0, 10) ?? ''
  if (entry.type === 'todo') return findDetail(todo_details, 'entry_id', entry.id)?.due_at?.slice(0, 10) ?? ''
  return entry.created_at.slice(0, 10)
}

const tagIdsOf = (entryId) => entryTags.filter((item) => item.entry_id === entryId).map((item) => item.tag_id)

const tagsOf = (entryId) =>
  tagIdsOf(entryId)
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter(Boolean)

const decorate = (entry) => {
  const detail =
    entry.type === 'event'
      ? findDetail(calendar_event_details, 'entry_id', entry.id)
      : entry.type === 'todo'
        ? findDetail(todo_details, 'entry_id', entry.id)
        : findDetail(note_details, 'entry_id', entry.id)

  return { ...entry, detail: detail || null, tags: tagsOf(entry.id) }
}

const tagCounts = () => {
  const counts = {}
  for (const relation of entryTags) {
    counts[relation.tag_id] = (counts[relation.tag_id] || 0) + 1
  }
  return counts
}

const NOW = new Date().toISOString()

export const getCurrentUser = () => delay(currentUser)

export const login = ({ email, password } = {}) => {
  if (!email || !password) {
    return Promise.reject(new Error('请输入工作邮箱和密码'))
  }
  return delay({ user: currentUser, token: 'mock-token' }, 300)
}

/** GET /calendar?from=&to=&view=&tag_id=&type=&include_completed= */
export const getCalendar = ({ from, to, tag_id = null, type = null, include_completed = false } = {}) => {
  const inRange = entries.filter((entry) => {
    if (entry.deleted_at) return false
    // 日程按 start_at 落在区间内；待办 / 备忘只有被「导入到日程」的日期才计入日历视图
    if (entry.type === 'event') {
      const dateKey = entryDateKey(entry)
      if (from && dateKey < from) return false
      if (to && dateKey > to) return false
    } else {
      const dates = entry.imported_dates || []
      if (from || to) {
        const hit = dates.some((d) => (!from || d >= from) && (!to || d <= to))
        if (!hit) return false
      }
    }
    if (tag_id && !tagIdsOf(entry.id).includes(tag_id)) return false
    if (type && entry.type !== type) return false
    if (!include_completed && entry.type === 'todo' && entry.completion_status === 'completed') {
      return false
    }
    return true
  })

  const ids = new Set(inRange.map((entry) => entry.id))

  return delay({
    entries: inRange,
    calendar_event_details: calendar_event_details.filter((detail) => ids.has(detail.entry_id)),
    todo_details: todo_details.filter((detail) => ids.has(detail.entry_id)),
    note_details: note_details.filter((detail) => ids.has(detail.entry_id)),
    tags,
    entry_tags: entryTags.filter((item) => ids.has(item.entry_id)),
    overview: buildOverview({ from, to }),
    nav_counts: countEntries(),
  })
}

/** GET /calendar/events/{id} 等详情接口的统一模拟 */
export const getEntry = (id) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  const decorated = decorate(entry)
  const linkedNotes = entries
    .filter((item) => item.type === 'note' && item.id !== entry.id)
    .filter((item) => tagsOf(item.id).some((tag) => decorated.tags.some((own) => own.id === tag.id)))
    .slice(0, 1)
    .map((item) => decorate(item))
  return delay({ ...decorated, linked_notes: linkedNotes })
}

/** PATCH /entries/{id} —— 仅更新本地 mock 内存 */
export const updateEntry = (id, { title, description, completion_status, priority } = {}) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  if (title !== undefined) entry.title = title
  if (description !== undefined) {
    entry.description = description
    if (entry.type === 'note') {
      const detail = findDetail(note_details, 'entry_id', id)
      if (detail) detail.content_text = description
    }
  }
  if (completion_status !== undefined) {
    entry.completion_status = completion_status
    const todo = findDetail(todo_details, 'entry_id', id)
    if (todo) todo.completed_at = completion_status === 'completed' ? NOW : null
  }
  if (priority !== undefined) {
    const todo = findDetail(todo_details, 'entry_id', id)
    if (todo) todo.priority = priority
  }
  entry.updated_at = NOW
  entry.version += 1
  return delay(decorate(entry), 140)
}

/** PUT /entries/{id}/tags —— 覆盖式更新条目标签 */
export const updateEntryTags = (id, tagIds = []) => {
  for (let index = entryTags.length - 1; index >= 0; index -= 1) {
    if (entryTags[index].entry_id === id) entryTags.splice(index, 1)
  }
  for (const tagId of tagIds) {
    entryTags.push({ entry_id: id, tag_id: tagId, created_at: NOW })
  }
  const entry = entries.find((item) => item.id === id)
  return delay(entry ? decorate(entry) : null, 100)
}

/** PUT /entries/{id}/related-refs —— 覆盖式更新手动关联条目（持久化到 mock 源） */
export const setEntryRelatedRefs = (id, refs = []) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  entry.related_refs = refs.map((r) => ({ type: r.type, id: r.id }))
  return delay(decorate(entry), 80)
}

/** PUT /entries/{id}/import-calendar —— 把待办 / 备忘导入到日程的指定日期（一条可导入到多个日期） */
export const importToCalendar = (id, dateKey) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  if (!Array.isArray(entry.imported_dates)) entry.imported_dates = []
  if (!entry.imported_dates.includes(dateKey)) {
    entry.imported_dates.push(dateKey)
    entry.imported_dates.sort()
  }
  entry.updated_at = NOW
  return delay(decorate(entry), 80)
}

/** DELETE /entries/{id}/import-calendar —— 从日程移除某个导入日期 */
export const removeFromCalendar = (id, dateKey) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  if (Array.isArray(entry.imported_dates)) {
    entry.imported_dates = entry.imported_dates.filter((d) => d !== dateKey)
  }
  entry.updated_at = NOW
  return delay(decorate(entry), 80)
}

/** PUT /entries/{id}/import-todos —— 把备忘导入到待办中心（仅切换显隐，不改条目类型） */
export const importToTodos = (id) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  entry.imported_to_todos = true
  entry.updated_at = NOW
  return delay(decorate(entry), 80)
}

/** DELETE /entries/{id}/import-todos —— 从待办中心移除导入的备忘 */
export const removeFromTodos = (id) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  entry.imported_to_todos = false
  entry.updated_at = NOW
  return delay(decorate(entry), 80)
}

let entrySeq = 0

/** POST /entries */
export const createEntry = ({ type = 'event', title, description = '', detail = {} } = {}) => {
  const id = `entry-new-${++entrySeq}`
  const entry = {
    id,
    user_id: currentUser.id,
    type,
    title: title || (type === 'event' ? '未命名日程' : type === 'todo' ? '未命名待办' : '未命名笔记'),
    description,
    completion_status: type === 'todo' ? 'pending' : null,
    deleted_at: null,
    created_via: 'manual',
    version: 1,
    created_at: NOW,
    updated_at: NOW,
    related_refs: [],
    imported_dates: [],
    imported_to_todos: false,
  }
  entries.push(entry)

  if (type === 'event') {
    calendar_event_details.push({
      entry_id: id,
      start_at: detail.start_at || `${TODAY_KEY}T09:00:00+08:00`,
      end_at: detail.end_at || `${TODAY_KEY}T10:00:00+08:00`,
      is_all_day: false,
      timezone: 'Asia/Shanghai',
      recurrence_rule: null,
      series_id: null,
      reminder_minutes: 15,
    })
  } else if (type === 'todo') {
    todo_details.push({
      entry_id: id,
      due_at: detail.due_at || `${TODAY_KEY}T18:00:00+08:00`,
      completed_at: null,
      priority: detail.priority || 'normal',
    })
    todo_list_items.push({ todo_list_id: detail.list_id || 'list-work', entry_id: id, sort_order: 999 })
  } else {
    note_details.push({
      entry_id: id,
      content_json: { type: 'doc', text: description },
      content_text: description,
    })
    note_blocks.push({
      id: `${id}-block-1`,
      note_entry_id: id,
      block_type: 'heading',
      content: entry.title,
      checked: null,
      indent: 0,
      sort_order: 1,
    })
  }
  entryTags.push({ entry_id: id, tag_id: 'tag-work', created_at: NOW })
  return delay(decorate(entry), 200)
}

/** DELETE /entries/{id}（软删除） */
export const deleteEntry = (id) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  entry.deleted_at = NOW
  return delay({ id, deleted_at: NOW }, 120)
}

/** GET /ai/tasks/{id} */
export const getAiTask = (id = 'ai-task-1') => {
  const task = ai_tasks.find((item) => item.id === id)
  if (!task) return Promise.reject(new Error('NOT_FOUND'))
  return delay({
    task,
    steps: ai_task_steps.filter((step) => step.ai_task_id === id),
    changes: ai_task_changes
      .filter((change) => change.ai_task_id === id)
      .map((change) => ({
        ...change,
        target_entry: entries.find((entry) => entry.id === change.target_entry_id) || null,
      })),
  })
}

/** AI 浮窗内容 */
export const getAiAssistant = () =>
  delay({ pending: ai_pending_tasks, queued: ai_queued_tasks, messages: ai_messages }, 60)

export const getSidebarSummary = () => {
  const todayEvents = entries
    .filter((entry) => entry.type === 'event' && !entry.deleted_at && entryDateKey(entry) === TODAY_KEY)
    .sort((a, b) => {
      const aDetail = findDetail(calendar_event_details, 'entry_id', a.id)
      const bDetail = findDetail(calendar_event_details, 'entry_id', b.id)
      return (aDetail?.start_at || '').localeCompare(bDetail?.start_at || '')
    })
  const nowTime = new Date().toTimeString().slice(0, 5)
  const nextEvent =
    todayEvents.find((entry) => {
      const detail = findDetail(calendar_event_details, 'entry_id', entry.id)
      return detail && detail.end_at.slice(11, 16) >= nowTime
    }) || todayEvents[0]

  const todayTodos = entries
    .filter((entry) => entry.type === 'todo' && !entry.deleted_at && entryDateKey(entry) === TODAY_KEY)
    .sort((a, b) => {
      const aDetail = findDetail(todo_details, 'entry_id', a.id)
      const bDetail = findDetail(todo_details, 'entry_id', b.id)
      return (aDetail?.due_at || '').localeCompare(bDetail?.due_at || '')
    })

  const todayNote = [...entries]
    .reverse()
    .find((entry) => entry.type === 'note' && !entry.deleted_at && entryDateKey(entry) === TODAY_KEY)

  const nextEventDetail = nextEvent ? findDetail(calendar_event_details, 'entry_id', nextEvent.id) : null

  return delay({
    user: currentUser,
    nav_counts: countEntries(),
    tags,
    tag_counts: tagCounts(),
    briefing: {
      date_label: formatDateCN(TODAY_KEY),
      next_event: nextEvent
        ? {
            start_at: nextEventDetail.start_at,
            end_at: nextEventDetail.end_at,
            title: nextEvent.title,
          }
        : null,
      todo_progress: {
        completed: todayTodos.filter((entry) => entry.completion_status === 'completed').length,
        total: todayTodos.length,
      },
      todos: todayTodos.slice(0, 3).map((entry) => ({
        id: entry.id,
        title: entry.title,
        completed: entry.completion_status === 'completed',
      })),
      note: todayNote ? { id: todayNote.id, title: todayNote.title } : null,
    },
  })
}

/** 工作空间元信息：标签、计数、待办清单 */
export const getWorkspaceMeta = () =>
  delay({
    user: currentUser,
    tags,
    tag_counts: tagCounts(),
    nav_counts: countEntries(),
    todo_lists,
  })

/** GET /todos?list_id= */
export const getTodos = ({ list_id = null, include_completed = true } = {}) => {
  const visible = entries.filter((entry) => {
    if (entry.deleted_at || entry.type !== 'todo') return false
    if (!include_completed && entry.completion_status === 'completed') return false
    if (list_id && !todo_list_items.some((item) => item.todo_list_id === list_id && item.entry_id === entry.id)) {
      return false
    }
    return true
  })
  const ids = new Set(visible.map((entry) => entry.id))
  return delay({
    entries: visible,
    todo_details: todo_details.filter((detail) => ids.has(detail.entry_id)),
    todo_lists,
    todo_list_items: todo_list_items.filter((item) => ids.has(item.entry_id)),
    tags,
    entry_tags: entryTags.filter((item) => ids.has(item.entry_id)),
  })
}

/** PATCH /todos/{id} */
export const toggleTodo = (entryId, completed) => {
  const entry = entries.find((item) => item.id === entryId)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  entry.completion_status = completed ? 'completed' : 'pending'
  entry.updated_at = NOW
  const detail = findDetail(todo_details, 'entry_id', entryId)
  if (detail) detail.completed_at = completed ? NOW : null
  return delay({ entry: structuredClone(entry) }, 80)
}

/** POST /todos/import —— 把笔记任务块或 AI 结果写入某个清单 */
let importSeq = 0
export const importTasksToList = ({ note_id = null, list_id = 'list-work', tasks = [] } = {}) => {
  const created = tasks.map((task, index) => {
    const id = `entry-import-${++importSeq}`
    entries.push({
      id,
      user_id: currentUser.id,
      type: 'todo',
      title: task.content,
      description: note_id ? '从备忘笔记导入' : '来自 AI 助手',
      completion_status: task.checked ? 'completed' : 'pending',
      deleted_at: null,
      created_via: note_id ? 'note_import' : 'ai',
      version: 1,
      created_at: NOW,
      updated_at: NOW,
    })
    todo_details.push({ entry_id: id, due_at: NOW, completed_at: task.checked ? NOW : null, priority: 'normal' })
    todo_list_items.push({ todo_list_id: list_id, entry_id: id, sort_order: 1000 + index })
    entryTags.push({ entry_id: id, tag_id: 'tag-work', created_at: NOW })
    return { id, title: task.content }
  })
  return delay({ created }, 260)
}

/** GET /notes */
export const getNotes = () => {
  const notes = entries.filter((entry) => entry.type === 'note' && !entry.deleted_at).map(decorate)
  return delay({ entries: notes, note_blocks, tags, entry_tags: entryTags })
}

/** GET /notes/{id} */
export const getNote = (id) => {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return Promise.reject(new Error('NOT_FOUND'))
  return delay({ entry: decorate(entry), blocks: blocksOf(id) }, 100)
}

const blocksOf = (id) => {
  const own = note_blocks
    .filter((block) => block.note_entry_id === id)
    .sort((a, b) => a.sort_order - b.sort_order)
  if (own.length) return own
  const detail = findDetail(note_details, 'entry_id', id)
  return [
    {
      id: `${id}-auto-1`,
      note_entry_id: id,
      block_type: 'text',
      content: detail?.content_text || '',
      checked: null,
      indent: 0,
      sort_order: 1,
    },
  ]
}

let blockSeq = 0
/** PATCH /notes/blocks/{id} */
export const updateNoteBlock = ({ id, content, checked } = {}) => {
  const block = note_blocks.find((item) => item.id === id)
  if (block) {
    if (content !== undefined) block.content = content
    if (checked !== undefined) block.checked = checked
  }
  return delay(block || null, 40)
}

/** POST /notes/blocks */
export const addNoteBlock = ({ note_entry_id, block_type = 'text', content = '', after_id = null } = {}) => {
  const siblings = note_blocks.filter((block) => block.note_entry_id === note_entry_id)
  const block = {
    id: `${note_entry_id}-block-new-${++blockSeq}`,
    note_entry_id,
    block_type,
    content,
    checked: block_type === 'todo' ? false : null,
    indent: 0,
    sort_order: siblings.length + 1,
  }
  if (after_id) {
    const index = note_blocks.findIndex((item) => item.id === after_id)
    if (index >= 0) note_blocks.splice(index + 1, 0, block)
    else note_blocks.push(block)
  } else {
    note_blocks.push(block)
  }
  return delay(block, 80)
}

/** DELETE /notes/blocks/{id} */
export const deleteNoteBlock = (id) => {
  const index = note_blocks.findIndex((item) => item.id === id)
  if (index >= 0) note_blocks.splice(index, 1)
  return delay({ id }, 60)
}

/** POST /tags */
let tagSeq = 0
export const createTag = ({ name, color }) => {
  const tag = {
    id: `tag-new-${++tagSeq}`,
    user_id: currentUser.id,
    name,
    color,
    created_at: NOW,
  }
  tags.push(tag)
  return delay(tag, 200)
}
