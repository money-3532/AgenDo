<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCalendarStore } from '@/stores/calendar'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAiStore } from '@/stores/ai'
import { createEntry, setEntryRelatedRefs, importToCalendar, removeFromCalendar, importToTodos, removeFromTodos } from '@/api'
import { formatDateCN } from '@/utils/date'
import AppSidebar from './AppSidebar.vue'
import WorkspaceTopBar from './WorkspaceTopBar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import EntryDrawer from '@/components/panel/EntryDrawer.vue'
import AiTaskDrawer from '@/components/panel/AiTaskDrawer.vue'
import EntryHoverPreview from '@/components/panel/EntryHoverPreview.vue'
import TagCreateModal from '@/components/notes/TagCreateModal.vue'
import ListPickerModal from '@/components/notes/ListPickerModal.vue'
import TodoPickerModal from '@/components/notes/TodoPickerModal.vue'
import NotePickerModal from '@/components/notes/NotePickerModal.vue'
import ImportDateModal from '@/components/ImportDateModal.vue'
import AiPendingCard from '@/components/ai/AiPendingCard.vue'

const route = useRoute()
const router = useRouter()
const cal = useCalendarStore()
const ws = useWorkspaceStore()
const ai = useAiStore()
const todoPickerVisible = ref(false)
const notePickerVisible = ref(false)
const importModalVisible = ref(false)
const importModalEntry = ref(null)

/** 侧栏拖拽：默认 300，上限 400 且保证工作区至少 900，低于 200 直接收起 */
const SIDEBAR_WIDTH = 300
const SIDEBAR_MAX_WIDTH = 400
const SIDEBAR_HIDE_THRESHOLD = 220
const WORKSPACE_MIN_WIDTH = 900
let collapseTimer = null
const dragState = { active: false, startX: 0, startWidth: 0, width: 0, moved: false }

const maxSidebarWidth = () => {
  const viewport = typeof window === 'undefined' ? 1440 : window.innerWidth
  return Math.max(SIDEBAR_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewport - WORKSPACE_MIN_WIDTH))
}

const clampSidebarWidth = (width) => Math.min(maxSidebarWidth(), Math.max(0, width))

/** 拖拽下限锁在阈值，松手时再决定收起 */
const clampDragWidth = (width) =>
  Math.min(maxSidebarWidth(), Math.max(SIDEBAR_HIDE_THRESHOLD, width))

const sidebarStyle = computed(() => ({
  width: `${cal.sidebarWidth}px`,
  transition: cal.sidebarDragging ? 'none' : undefined,
}))

const clearCollapseTimer = () => {
  if (!collapseTimer) return
  clearTimeout(collapseTimer)
  collapseTimer = null
}

const hideSidebar = () => {
  clearCollapseTimer()
  cal.sidebarWidth = 0
  collapseTimer = setTimeout(() => {
    collapseTimer = null
    if (!cal.sidebarDragging && cal.sidebarWidth === 0) cal.sidebarHidden = true
  }, 140)
}

const revealSidebar = () => {
  clearCollapseTimer()
  cal.sidebarHidden = false
  cal.sidebarWidth = 0
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cal.sidebarWidth = SIDEBAR_WIDTH
    })
  })
}

const onHandlePointerDown = (event) => {
  if (event.button !== 0) return
  clearCollapseTimer()
  dragState.active = true
  dragState.startX = event.clientX
  dragState.startWidth = cal.sidebarHidden ? 0 : cal.sidebarWidth
  dragState.width = dragState.startWidth
  dragState.moved = false
  cal.sidebarDragging = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

const onHandlePointerMove = (event) => {
  if (!dragState.active) return
  const delta = event.clientX - dragState.startX
  if (Math.abs(delta) > 3) dragState.moved = true

  // 隐藏态向右拖出：从默认宽度 280 开始，之后可继续调整
  if (cal.sidebarHidden) {
    if (!dragState.moved || delta <= 0) return
    cal.sidebarHidden = false
    dragState.startX = event.clientX
    dragState.startWidth = SIDEBAR_WIDTH
    dragState.width = SIDEBAR_WIDTH
    cal.sidebarWidth = SIDEBAR_WIDTH
    return
  }

  const raw = dragState.startWidth + delta
  const next = clampDragWidth(raw)
  // 触到上下限后重置锚点，回拉时立刻跟手
  if (raw < SIDEBAR_HIDE_THRESHOLD || raw > maxSidebarWidth()) {
    dragState.startX = event.clientX
    dragState.startWidth = next
  }
  dragState.width = next
  cal.sidebarWidth = next
}

const onHandlePointerUp = (event) => {
  if (!dragState.active) return
  dragState.active = false
  cal.sidebarDragging = false
  event.currentTarget.releasePointerCapture?.(event.pointerId)

  // 未移动视为点击：隐藏 / 唤出
  if (!dragState.moved) {
    if (cal.sidebarHidden) revealSidebar()
    else hideSidebar()
    return
  }

  // 停在阈值处松手即收起；阈值以上保持当前宽度
  if (dragState.width <= SIDEBAR_HIDE_THRESHOLD) hideSidebar()
  else cal.sidebarWidth = clampSidebarWidth(dragState.width)
}

onBeforeUnmount(clearCollapseTimer)

const navKey = computed(() => {
  if (route.name === 'todos') return 'todos'
  if (route.name === 'notes' || route.name === 'note-detail') return 'notes'
  return 'calendar'
})

/** 侧栏「新建」按钮文案随当前页面变化 */
const newEntryLabel = computed(() => {
  if (navKey.value === 'todos') return '新建待办'
  if (navKey.value === 'notes') return '新建笔记'
  return '新建日程'
})

const page = computed(() => {
  if (navKey.value === 'todos') {
    return {
      title: '待办中心',
      hint: '把今天要完成的事，一件件划掉。',
      search: '搜索待办与笔记',
    }
  }
  if (navKey.value === 'notes') {
    return {
      title: '备忘笔记',
      hint: '',
      search: '搜索笔记与标签',
    }
  }
  return {
    title: '我的日程',
    hint: '把重要的事，放在合适的时间。',
    search: '搜索日程、待办与备忘',
  }
})

/** 侧栏上下文列表：仅备忘录页展示笔记目录，其余页面隐藏 */
const sidebarContext = computed(() => {
  if (navKey.value === 'notes') {
    return {
      kind: 'notes',
      items: ws.notes,
      activeId: route.params.id,
    }
  }
  return null
})

const navCounts = computed(() => {
  const { calendar, todos, notes } = ws.counts
  return calendar || todos || notes ? ws.counts : cal.navCounts
})

const hoverPreviewData = computed(() => {
  const { entry } = cal.hoverPreview
  if (!entry) return cal.hoverPreview

  const relatedRefs = entry.related_refs || []
  const related = relatedRefs
    .map((ref) => {
      // 优先从工作区数据解析，回落到日历条目（保证跨日期关联也能显示）
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

  return { ...cal.hoverPreview, detail: cal.details[entry.id], related }
})

const handleNav = (key) => {
  if (key === 'ai') {
    ai.openTask()
    return
  }
  if (key === 'calendar') router.push('/')
  if (key === 'todos') router.push('/todos')
  if (key === 'notes') router.push('/notes')
}

const handleCreateContext = async (kind) => {
  if (kind === 'notes') {
    const note = await createEntry({ type: 'note', title: '未命名笔记', description: '' })
    await ws.loadNotes()
    router.push(`/notes/${note.id}`)
    ws.showToast('已新建笔记')
    return
  }
  cal.openDraft({ type: 'todo' })
}

const handleNewEntry = () => {
  if (navKey.value === 'notes') {
    handleCreateContext('notes')
    return
  }
  if (navKey.value === 'todos') {
    cal.openDraft({ type: 'todo' })
    return
  }
  cal.openDraft()
}

const handleSave = async (payload) => {
  if (payload && payload.type === 'open-note') {
    cal.closeEntry()
    router.push(`/notes/${payload.id}`)
    return
  }
  await cal.saveEntry(payload)
  await Promise.all([ws.refreshMeta(), ws.loadTodos()])
}

const handleDelete = async (id) => {
  await cal.removeEntry(id)
  await Promise.all([ws.refreshMeta(), ws.loadTodos()])
}

/** 悬浮窗内勾选待办：同步工作区与日历副本，避免两处状态不一致 */
const handlePreviewToggle = async (id) => {
  await ws.toggleTodo(id)
  const entry = cal.entries.find((item) => item.id === id)
  const todo = ws.todos.find((item) => item.id === id)
  if (entry && todo) entry.completion_status = todo.completion_status
}

const handleSelectList = (listId) => {
  router.push({ path: '/todos', query: { list: listId } })
}

const ensureRelatedRefs = () => {
  if (cal.drawerEntry && !cal.drawerEntry.related_refs) {
    cal.drawerEntry.related_refs = []
  }
}

/** 统一持久化 refs：同时写 drawerEntry + mock 源 + cal.entries 副本（三者同步） */
const persistRefs = (newRefs) => {
  if (!cal.drawerEntry) return
  cal.drawerEntry.related_refs = newRefs
  setEntryRelatedRefs(cal.drawerEntry.id, newRefs)
  // 同步更新 cal.entries 里的对应对象（entriesByDate 是 getter，会自动跟上）
  const mirror = cal.entries.find((e) => e.id === cal.drawerEntry.id)
  if (mirror) mirror.related_refs = newRefs
}

const handleRelatedConfirm = (ids) => {
  todoPickerVisible.value = false
  ensureRelatedRefs()
  let added = 0
  const current = cal.drawerEntry.related_refs || []
  for (const id of ids || []) {
    if (!current.some((r) => r.type === 'todo' && r.id === id)) {
      current.push({ type: 'todo', id })
      added++
    }
  }
  persistRefs(current)
  ws.showToast(added ? `已关联 ${added} 条待办` : '未选择待办')
}

const handleNotePicked = (note) => {
  notePickerVisible.value = false
  if (!note) return
  ensureRelatedRefs()
  const current = cal.drawerEntry.related_refs || []
  if (!current.some((r) => r.type === 'note' && r.id === note.id)) {
    current.push({ type: 'note', id: note.id })
    persistRefs(current)
    ws.showToast(`已关联备忘「${note.title}」`)
  }
}

const handleRemoveRelated = ({ type, id }) => {
  ensureRelatedRefs()
  const current = (cal.drawerEntry.related_refs || []).filter(
    (r) => !(r.type === type && r.id === id),
  )
  persistRefs(current)
}

/** 笔记 / 待办导入到日程：打开日期选择弹窗 */
const handleImportNote = (entry) => {
  if (!entry) return
  const fresh =
    ws.notes.find((n) => n.id === entry.id) ||
    ws.todos.find((t) => t.id === entry.id) ||
    cal.entries.find((e) => e.id === entry.id) ||
    entry
  importModalEntry.value = fresh
  importModalVisible.value = true
}

/** 导入 / 移除后用最新数据刷新弹窗里的条目，保证「已导入到」列表实时更新 */
const refreshImportEntry = () => {
  if (!importModalEntry.value) return
  const id = importModalEntry.value.id
  const fresh =
    ws.notes.find((n) => n.id === id) ||
    ws.todos.find((t) => t.id === id) ||
    cal.entries.find((e) => e.id === id)
  if (fresh) importModalEntry.value = fresh
}

const handleImportConfirm = async (dateKey) => {
  const entry = importModalEntry.value
  if (!entry || !dateKey) return
  await importToCalendar(entry.id, dateKey)
  await Promise.all([cal.load(), ws.loadNotes(), ws.loadTodos()])
  refreshImportEntry()
  ws.showToast(`已导入到日程：${formatDateCN(dateKey)}`)
}

const handleImportRemove = async (dateKey) => {
  const entry = importModalEntry.value
  if (!entry) return
  await removeFromCalendar(entry.id, dateKey)
  await Promise.all([cal.load(), ws.loadNotes(), ws.loadTodos()])
  refreshImportEntry()
  ws.showToast('已从日程移除')
}

const closeImportModal = () => {
  importModalVisible.value = false
  importModalEntry.value = null
}

/** 笔记导入到待办中心：点击切换（已导入则移除），原笔记仍保留在备忘笔记 */
const handleToggleImportTodos = async (note) => {
  if (!note) return
  if (note.imported_to_todos) {
    await removeFromTodos(note.id)
    ws.showToast('已从待办中心移除')
  } else {
    await importToTodos(note.id)
    ws.showToast(`已导入到待办中心：${note.title}`)
  }
  await ws.loadNotes()
}

onMounted(() => {
  ws.bootstrap()
  cal.loadSummary()
  ai.bootstrap()
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar
      v-if="!cal.sidebarHidden"
      :style="sidebarStyle"
      :user="ws.user || cal.summary?.user"
      :briefing="cal.summary?.briefing"
      :counts="navCounts"
      :active-key="navKey"
      :context="sidebarContext"
      :new-label="newEntryLabel"
      @toggle="hideSidebar"
      @new-entry="handleNewEntry"
      @select="handleNav"
      @open-ai="ai.openTask"
      @select-note="(id) => router.push(`/notes/${id}`)"
      @select-list="handleSelectList"
      @create-context="handleCreateContext"
      @import-note="handleImportNote"
      @import-note-todos="handleToggleImportTodos"
    />

    <div class="workspace">
      <button
        class="collapse-handle"
        type="button"
        :aria-label="cal.sidebarHidden ? '显示侧栏' : '收起侧栏'"
        title="拖动调整侧栏宽度"
        @pointerdown.prevent="onHandlePointerDown"
        @pointermove="onHandlePointerMove"
        @pointerup="onHandlePointerUp"
        @pointercancel="onHandlePointerUp"
      >
        <AppIcon :name="cal.sidebarHidden ? 'chevron-right' : 'chevron-left'" :size="12" />
      </button>

      <WorkspaceTopBar
        v-if="navKey !== 'notes'"
        :title="page.title"
        :hint="page.hint"
        :search="page.search"
      />

      <main class="workspace__main">
        <slot />
      </main>
    </div>

    <EntryDrawer
      :entry="cal.drawerEntry"
      :loading="cal.drawerLoading"
      @close="cal.closeEntry"
      @save="handleSave"
      @delete="handleDelete"
      @pick-related="todoPickerVisible = true"
      @pick-note="notePickerVisible = true"
      @remove-related="handleRemoveRelated"
    />

    <AiTaskDrawer
      :task-data="ai.task"
      :loading="ai.taskLoading"
      @close="ai.closeTask"
      @cancel="ai.closeTask"
      @confirm="ai.confirmPlan"
    />

    <EntryHoverPreview
      :preview="hoverPreviewData"
      @open="cal.openEntry"
      @enter="cal.handleHoverPreviewEnter"
      @leave="cal.hideHoverPreview"
      @toggle="handlePreviewToggle"
    />

    <TagCreateModal v-if="ws.tagModalVisible" @close="ws.closeTagModal" @create="ws.createTag" />

    <ListPickerModal
      v-if="ws.listPicker.visible"
      :picker="ws.listPicker"
      :lists="ws.todoLists"
      :counts="ws.pendingCountByList"
      @close="ws.closeListPicker"
      @confirm="ws.confirmImport"
    />

    <TodoPickerModal
      :visible="todoPickerVisible"
      :todos="ws.todos"
      :details="ws.todoDetails"
      @close="todoPickerVisible = false"
      @confirm="handleRelatedConfirm"
    />

    <NotePickerModal
      :visible="notePickerVisible"
      :notes="ws.notes"
      @close="notePickerVisible = false"
      @confirm="handleNotePicked"
    />

    <ImportDateModal
      :visible="importModalVisible"
      :entry="importModalEntry"
      @close="closeImportModal"
      @import="handleImportConfirm"
      @remove="handleImportRemove"
    />

    <AiPendingCard />

    <transition name="toast">
      <div v-if="ws.toast" class="toast">{{ ws.toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--color-bg-page);
}

.workspace {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 900px;
  height: 100%;
}

.collapse-handle {
  position: absolute;
  left: -1px;
  top: 50%;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 36px;
  transform: translateY(-50%);
  border: 1px solid #dce4ee;
  border-radius: var(--radius-7);
  background: #f4f7fb;
  color: var(--color-text-secondary);
  box-shadow: 0 2px 6px rgba(38, 61, 89, 0.1);
  cursor: col-resize;
  touch-action: none;
  user-select: none;
}

.collapse-handle:hover {
  color: var(--color-brand);
}

.workspace__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-16);
  min-height: 0;
  padding: var(--space-24);
  background: var(--color-bg-page);
}

.toast {
  position: fixed;
  bottom: var(--space-32);
  left: 50%;
  z-index: 90;
  padding: var(--space-9) var(--space-16);
  border-radius: var(--radius-8);
  background: rgba(31, 42, 55, 0.92);
  font-size: var(--font-size-12);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-ai);
  transform: translateX(-50%);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
