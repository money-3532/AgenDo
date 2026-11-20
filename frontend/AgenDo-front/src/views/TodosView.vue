<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendarStore } from '@/stores/calendar'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  TODAY_KEY,
  formatDateCN,
  formatTime,
  formatDayGroupLabel,
  parseDateKey,
  addDays,
  toDateKey,
  WEEKDAY_LABELS,
} from '@/utils/date'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TooltipText from '@/components/ui/TooltipText.vue'
import ImportDateModal from '@/components/ImportDateModal.vue'
import EntryHoverPreview from '@/components/panel/EntryHoverPreview.vue'
import TodoFilterPanel from '@/components/todos/TodoFilterPanel.vue'
import { importToCalendar, removeFromCalendar, removeFromTodos } from '@/api'

const cal = useCalendarStore()
const ws = useWorkspaceStore()
const router = useRouter()

const importModalVisible = ref(false)
const importModalEntry = ref(null)

/** 三组条件交集筛选；优先级和状态支持组内多选，空数组表示全部 */
const filterPriority = ref([])
const filterStatus = ref([])
const filterTime = ref('all')
const filterCustomDate = ref('')

/** 列表附属信息随时间筛选更新，无截止日期和自定义日期归属于全部范围 */
const activeTab = computed(() =>
  filterTime.value === 'today' || filterTime.value === 'week' ? filterTime.value : 'all',
)

const customDateLabel = computed(() => (filterCustomDate.value ? formatDateCN(filterCustomDate.value) : ''))

const clearFilters = () => {
  filterPriority.value = []
  filterStatus.value = []
  filterTime.value = 'all'
  filterCustomDate.value = ''
}

onMounted(() => {
  if (!ws.todos.length) ws.loadTodos()
  if (!ws.notes.length) ws.loadNotes()
  if (!cal.entries.length) cal.load()
})

onBeforeUnmount(() => {
  clearTimeout(previewHideTimer)
})

const dueKey = (entry) => ws.todoDetails[entry.id]?.due_at?.slice(0, 10) || ''
const dueTime = (entry) => formatTime(ws.todoDetails[entry.id]?.due_at)

const weekRange = computed(() => {
  const today = parseDateKey(TODAY_KEY)
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return { from: toDateKey(monday), to: toDateKey(addDays(monday, 6)) }
})

const sortTodos = (list) => {
  const sorted = [...list].sort((a, b) => {
    const diff = (ws.todoDetails[a.id]?.due_at || '').localeCompare(ws.todoDetails[b.id]?.due_at || '')
    if (diff !== 0) return diff
    return a.title.localeCompare(b.title, 'zh')
  })
  return sorted
}

/** 已逾期：未完成且截止日期早于今天 */
const isOverdue = (entry) => {
  if (entry.completion_status === 'completed') return false
  const key = dueKey(entry)
  return !!key && key < TODAY_KEY
}

/** 多条件交集筛选：优先级 / 状态 / 时间，组内多选、组间交集 */
const filteredTodos = computed(() =>
  ws.todos.filter((entry) => {
    if (filterPriority.value.length) {
      const priority = ws.todoDetails[entry.id]?.priority || 'normal'
      if (!filterPriority.value.includes(priority)) return false
    }
    if (filterStatus.value.length) {
      const matchesStatus = filterStatus.value.some((status) => {
        if (status === 'completed') return entry.completion_status === 'completed'
        if (status === 'pending') return entry.completion_status === 'pending'
        return isOverdue(entry)
      })
      if (!matchesStatus) return false
    }
    const key = dueKey(entry)
    if (filterTime.value === 'today' && key !== TODAY_KEY) return false
    if (filterTime.value === 'week' && !(key >= weekRange.value.from && key <= weekRange.value.to)) return false
    if (filterTime.value === 'no_due' && key) return false
    if (filterTime.value === 'custom' && key !== filterCustomDate.value) return false
    return true
  }),
)

const scopeTodos = computed(() => sortTodos(filteredTodos.value))

const cardTitle = computed(() => {
  if (filterTime.value === 'today') return '今日任务'
  if (filterTime.value === 'week') return '本周任务'
  if (filterTime.value === 'no_due') return '无截止日期'
  if (filterTime.value === 'custom') return '指定日期任务'
  return '全部任务'
})

const sortHint = computed(() => {
  if (filterTime.value === 'today') return '按 24 小时排序'
  if (filterTime.value === 'week') return '按星期排序'
  return '按日期排序'
})

/** 周视图 / 全部视图按日期分组；单日 / 无截止日期为单一分组 */
const groups = computed(() => {
  if (filterTime.value === 'today') return [{ key: TODAY_KEY, label: '', entries: scopeTodos.value }]
  if (filterTime.value === 'custom')
    return [{ key: filterCustomDate.value, label: '', entries: scopeTodos.value }]
  if (filterTime.value === 'no_due') return [{ key: 'no_due', label: '无截止日期', entries: scopeTodos.value }]
  const map = new Map()
  for (const entry of scopeTodos.value) {
    const key = dueKey(entry) || TODAY_KEY
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  const keys = [...map.keys()].sort()
  return keys.map((key) => {
    const weekday = WEEKDAY_LABELS[(parseDateKey(key).getDay() + 6) % 7]
    const label =
      filterTime.value === 'week'
        ? `${weekday} · ${formatDateCN(key)}${key === TODAY_KEY ? ' · 今天' : ''}`
        : formatDayGroupLabel(key)
    return { key, label, entries: map.get(key) }
  })
})

const tagList = (entry) => ws.todoTags[entry.id] || []

const progress = computed(() => {
  const list = scopeTodos.value
  const done = list.filter((entry) => entry.completion_status === 'completed').length
  return { done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 }
})

const progressTitle = computed(() => (activeTab.value === 'today' ? '今日进度' : '本周进度'))
const progressHint = computed(() => {
  const remain = progress.value.total - progress.value.done
  if (activeTab.value === 'today') return `保持节奏，还剩 ${remain} 项待完成。`
  return `还剩 ${remain} 项待完成，周五前收尾。`
})

/** 按标签统计同样来自当前范围的待办数据 */
const tagBreakdown = computed(() =>
  ws.tags.map((tag) => ({
    ...tag,
    count: scopeTodos.value.filter((entry) => tagList(entry).some((item) => item.id === tag.id)).length,
  })),
)

const todayEvents = computed(() =>
  cal.entries
    .filter((entry) => entry.type === 'event' && cal.details[entry.id]?.dateKey === TODAY_KEY)
    .map((entry) => ({
      ...entry,
      time: formatTime(cal.details[entry.id]?.start_at),
      tag: cal.details[entry.id]?.tags?.[0] || null,
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 4),
)

/** 待办导入到日程：打开日期选择弹窗 */
const openImport = (entry) => {
  const fresh = ws.todos.find((t) => t.id === entry.id) || entry
  importModalEntry.value = fresh
  importModalVisible.value = true
}

const refreshImportEntry = () => {
  if (!importModalEntry.value) return
  const id = importModalEntry.value.id
  const fresh = ws.todos.find((t) => t.id === id) || cal.entries.find((e) => e.id === id)
  if (fresh) importModalEntry.value = fresh
}

const handleImportConfirm = async (dateKey) => {
  const entry = importModalEntry.value
  if (!entry || !dateKey) return
  await importToCalendar(entry.id, dateKey)
  await Promise.all([cal.load(), ws.loadTodos()])
  refreshImportEntry()
  ws.showToast(`已导入到日程：${formatDateCN(dateKey)}`)
}

const handleImportRemove = async (dateKey) => {
  const entry = importModalEntry.value
  if (!entry) return
  await removeFromCalendar(entry.id, dateKey)
  await Promise.all([cal.load(), ws.loadTodos()])
  refreshImportEntry()
  ws.showToast('已从日程移除')
}

const closeImportModal = () => {
  importModalVisible.value = false
  importModalEntry.value = null
}

/** 导入到待办中心的笔记（不污染 ws.todos 统计，仅在列表层混入展示） */
const importedNotes = computed(() =>
  [...ws.notes]
    .filter((note) => note.imported_to_todos)
    .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')),
)

/** 关联引用以日历条目副本为准，避免工作区列表缓存未包含最新关联 */
const freshEntry = (entry) => cal.entries.find((item) => item.id === entry.id) || entry

/** 解析条目的关联引用，供悬浮预览展示（与 AppLayout 逻辑一致） */
const resolveRelated = (entry) => {
  const refs = entry.related_refs || []
  return refs
    .map((ref) => {
      const fallback = cal.entries.find((e) => e.id === ref.id) || null
      if (ref.type === 'todo') {
        const todo = ws.todos.find((t) => t.id === ref.id) || fallback
        if (!todo) return null
        return { entry: todo, detail: ws.todoDetails[todo.id] || cal.details[todo.id] || null }
      }
      const note = ws.notes.find((n) => n.id === ref.id) || fallback
      if (!note) return null
      return { entry: note, detail: null }
    })
    .filter(Boolean)
}

/** 笔记行 hover 预览状态（局部，避免与日历全局 hoverPreview 串扰） */
const notePreview = ref({ visible: false, entry: null, detail: null, related: [], x: 0, y: 0, anchorEl: null })

/** 悬浮窗关闭延时：留出从条目移到浮层的时间 */
const PREVIEW_HIDE_DELAY = 400
let previewHideTimer = 0
let previewHovered = false

const cancelHideNotePreview = () => {
  clearTimeout(previewHideTimer)
  previewHideTimer = 0
}

const handlePreviewEnter = () => {
  previewHovered = true
  cancelHideNotePreview()
}

const scheduleHideNotePreview = () => {
  cancelHideNotePreview()
  previewHideTimer = setTimeout(() => {
    if (!previewHovered) hideNotePreview()
  }, PREVIEW_HIDE_DELAY)
}

const showNotePreview = (note, event) => {
  cancelHideNotePreview()
  previewHovered = false
  notePreview.value = {
    visible: true,
    entry: note,
    detail: null,
    related: resolveRelated(freshEntry(note)),
    x: event?.clientX || 0,
    y: event?.clientY || 0,
    anchorEl: event?.currentTarget || null,
  }
}

const hideNotePreview = () => {
  cancelHideNotePreview()
  previewHovered = false
  notePreview.value = { ...notePreview.value, visible: false }
}

/** 待办行 hover 预览（与笔记行共用同一浮层状态） */
const showTodoPreview = (entry, event) => {
  cancelHideNotePreview()
  previewHovered = false
  const related = resolveRelated(freshEntry(entry))
  notePreview.value = {
    visible: true,
    entry,
    detail: ws.todoDetails[entry.id] || cal.details[entry.id] || null,
    related,
    x: event?.clientX || 0,
    y: event?.clientY || 0,
    anchorEl: event?.currentTarget || null,
  }
}

/** 预览卡片点击：笔记跳详情，待办打开条目抽屉 */
const openPreviewEntry = (id) => {
  const entry = notePreview.value.entry
  hideNotePreview()
  if (entry?.type === 'note') {
    router.push(`/notes/${entry.id}`)
  } else {
    cal.openEntry(id)
  }
}

const goNote = (note) => {
  hideNotePreview()
  router.push(`/notes/${note.id}`)
}

const handleRemoveNoteFromTodos = async (note) => {
  await removeFromTodos(note.id)
  await ws.loadNotes()
  ws.showToast('已从待办中心移除')
}
</script>

<template>
  <AppLayout>
    <div class="todos">
      <TodoFilterPanel
        v-model:priority="filterPriority"
        v-model:status="filterStatus"
        v-model:time="filterTime"
        v-model:custom-date="filterCustomDate"
        :custom-date-label="customDateLabel"
        @clear="clearFilters"
      />

      <div class="todos__layout">
        <section class="todo-card">
          <header class="todo-card__head">
            <span class="todo-card__dot" aria-hidden="true"></span>
            <h3 class="todo-card__title">{{ cardTitle }} {{ scopeTodos.length }}</h3>
            <span class="todo-card__hint">{{ sortHint }}</span>
          </header>

          <div class="todo-card__body">
            <section v-if="importedNotes.length" class="note-import">
              <p class="note-import__label">导入的笔记</p>
              <ul class="note-import__items">
                <li v-for="note in importedNotes" :key="note.id">
                  <div
                    class="note-import-row"
                    @mouseenter="showNotePreview(note, $event)"
                    @mouseleave="scheduleHideNotePreview"
                  >
                    <span class="note-import-row__icon" aria-hidden="true">
                      <AppIcon name="file-text" :size="12" />
                    </span>
                    <button class="note-import-row__main" type="button" @click="goNote(note)">
                      <TooltipText class="note-import-row__title" :text="note.title" />
                      <span class="note-import-row__meta">笔记</span>
                    </button>
                    <button
                      class="note-import-row__remove"
                      type="button"
                      aria-label="从待办中心移除"
                      title="从待办中心移除该导入"
                      @click.stop="handleRemoveNoteFromTodos(note)"
                    >
                      <AppIcon name="x" :size="11" />
                    </button>
                  </div>
                </li>
              </ul>
            </section>

            <section v-for="group in groups" :key="group.key" class="todo-group">
              <p v-if="group.label" class="todo-group__label">{{ group.label }}</p>

              <ul class="todo-group__items">
                <li v-for="entry in group.entries" :key="entry.id">
                  <div
                    class="todo-row"
                    :class="{ 'todo-row--done': entry.completion_status === 'completed' }"
                    @mouseenter="showTodoPreview(entry, $event)"
                    @mouseleave="scheduleHideNotePreview"
                  >
                    <button
                      class="todo-row__check"
                      type="button"
                      :aria-label="entry.completion_status === 'completed' ? '标记为未完成' : '标记为已完成'"
                      @click="ws.toggleTodo(entry.id)"
                    >
                      <AppIcon
                        v-if="entry.completion_status === 'completed'"
                        name="check"
                        :size="10"
                        :stroke-width="2.6"
                      />
                    </button>

                    <button class="todo-row__main" type="button" @click="cal.openEntry(entry.id)">
                      <TooltipText class="todo-row__title" :text="entry.title" />
                      <span v-if="activeTab === 'today'" class="todo-row__meta">
                        › {{ entry.version }} 条编辑
                      </span>
                    </button>

                    <span v-if="activeTab === 'today'" class="todo-row__time">{{ dueTime(entry) }}</span>
                    <span v-else class="todo-row__aside">
                      <template v-if="entry.completion_status === 'completed'">{{ tagList(entry)[0]?.name }}</template>
                      <template v-else-if="dueKey(entry) === TODAY_KEY">{{ tagList(entry)[0]?.name }} · {{ dueTime(entry) }}</template>
                      <template v-else>{{ tagList(entry)[0]?.name }}</template>
                    </span>

                    <button
                      class="todo-row__import"
                      :class="{ 'todo-row__import--active': entry.imported_dates && entry.imported_dates.length }"
                      type="button"
                      :aria-label="`导入「${entry.title}」到日程`"
                      :title="entry.imported_dates && entry.imported_dates.length ? `已导入到日程（${entry.imported_dates.length}）` : '导入到日程'"
                      @click.stop="openImport(entry)"
                    >
                      <AppIcon name="import" :size="12" />
                    </button>
                  </div>
                </li>
              </ul>
            </section>

            <p v-if="!scopeTodos.length && !importedNotes.length" class="todo-card__empty">这里还没有待办，点击右上角新建一条。</p>
          </div>
        </section>

        <aside v-if="activeTab !== 'all'" class="todos__side">
          <section class="side-card">
            <h4 class="side-card__title">{{ progressTitle }}</h4>
            <p class="side-card__progress">
              <span class="side-card__done">{{ progress.done }}</span>
              <span class="side-card__total">/ {{ progress.total }}</span>
              <span class="side-card__label">已完成</span>
            </p>
            <span class="side-card__track" aria-hidden="true">
              <span class="side-card__fill" :style="{ width: `${progress.percent}%` }"></span>
            </span>
            <p class="side-card__hint">{{ progressHint }}</p>
          </section>

          <section class="side-card">
            <h4 class="side-card__title">按标签</h4>
            <ul class="tag-list">
              <li v-for="tag in tagBreakdown" :key="tag.id" class="tag-list__row">
                <i class="tag-list__dot" :style="{ background: tag.color }"></i>
                <span>{{ tag.name }}</span>
                <span class="tag-list__count">{{ tag.count }}</span>
              </li>
            </ul>
          </section>

          <section v-if="activeTab === 'today'" class="side-card">
            <h4 class="side-card__title">今日日程</h4>
            <ul v-if="todayEvents.length" class="schedule-list">
              <li v-for="event in todayEvents" :key="event.id" class="schedule-list__row">
                <span class="schedule-list__time">{{ event.time }}</span>
                <span class="schedule-list__title">{{ event.title }}</span>
                <i
                  class="schedule-list__dot"
                  :style="{ background: event.tag ? event.tag.color : 'var(--color-text-link)' }"
                ></i>
              </li>
            </ul>
            <p v-else class="side-card__hint">今天没有日程安排。</p>
          </section>
        </aside>
      </div>
    </div>
    <EntryHoverPreview
      :preview="notePreview"
      @open="openPreviewEntry"
      @enter="handlePreviewEnter"
      @leave="hideNotePreview"
      @toggle="ws.toggleTodo"
    />
    <ImportDateModal
      :visible="importModalVisible"
      :entry="importModalEntry"
      @close="closeImportModal"
      @import="handleImportConfirm"
      @remove="handleImportRemove"
    />
  </AppLayout>
</template>

<style scoped>
.todos {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-16);
  min-height: 0;
}

.todos__layout {
  display: flex;
  flex: 1;
  gap: var(--space-16);
  min-height: 0;
}

.todo-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.todo-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  flex-shrink: 0;
  padding: var(--space-14) var(--space-16);
  border-bottom: 1px solid var(--color-border);
}

.todo-card__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-brand);
}

.todo-card__title {
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.todo-card__hint {
  margin-left: auto;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.todo-card__body {
  flex: 1;
  min-height: 0;
  padding: 0 var(--space-16) var(--space-16);
  overflow-y: auto;
}

.todo-group__label {
  padding: var(--space-12) 0 var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.todo-group__items {
  display: flex;
  flex-direction: column;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  min-height: 50px;
  padding: var(--space-8) 0;
  border-bottom: 1px solid var(--color-border);
}

.todo-row:last-child {
  border-bottom: none;
}

.todo-row__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-4);
  color: var(--color-text-inverse);
}

.todo-row--done .todo-row__check {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.todo-row__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  text-align: left;
}

.todo-row__title {
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.todo-row--done .todo-row__title {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.todo-row__meta {
  overflow: hidden;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-row__time {
  flex-shrink: 0;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.todo-row__aside {
  flex-shrink: 0;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.todo-row__import {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity 0.1s ease, color 0.1s ease, background 0.1s ease;
}

.todo-row:hover .todo-row__import {
  opacity: 1;
}

.todo-row__import:hover {
  color: var(--color-brand);
  background: var(--color-bg-card);
}

.todo-row__import--active {
  opacity: 1;
  color: var(--color-brand);
}

.note-import__label {
  padding: var(--space-12) 0 var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.note-import__items {
  display: flex;
  flex-direction: column;
}

.note-import-row {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  min-height: 50px;
  padding: var(--space-8) 0;
  border-bottom: 1px solid var(--color-border);
}

.note-import-row:last-child {
  border-bottom: none;
}

.note-import-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.note-import-row__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  text-align: left;
}

.note-import-row__title {
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.note-import-row__meta {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.note-import-row__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity 0.1s ease, color 0.1s ease, background 0.1s ease;
}

.note-import-row:hover .note-import-row__remove {
  opacity: 1;
}

.note-import-row__remove:hover {
  color: var(--color-danger);
  background: var(--color-bg-card);
}

.todo-card__empty {
  padding: var(--space-24) 0;
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}

.todos__side {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--space-12);
  width: 292px;
  overflow-y: auto;
}

.side-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  flex-shrink: 0;
  padding: var(--space-14);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.side-card__title {
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.side-card__progress {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.side-card__done {
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  color: var(--color-text-primary);
}

.side-card__total {
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.side-card__label {
  margin-left: var(--space-2);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.side-card__track {
  display: block;
  height: 4px;
  overflow: hidden;
  border-radius: var(--radius-2);
  background: var(--color-progress-track);
}

.side-card__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-2);
  background: var(--color-progress-summary-fill);
}

.side-card__hint {
  font-size: var(--font-size-10);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.tag-list__row {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
}

.tag-list__dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
}

.tag-list__count {
  margin-left: auto;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.schedule-list__row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--font-size-11);
}

.schedule-list__time {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.schedule-list__title {
  overflow: hidden;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-list__dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  margin-left: auto;
  border-radius: var(--radius-full);
}
</style>
