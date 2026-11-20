<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import NoteBlock from './NoteBlock.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useCalendarStore } from '@/stores/calendar'
import { updateEntry, importToTodos, removeFromTodos } from '@/api'
import { tagStyle } from '@/utils/tags'
import { TODAY_KEY, daysBetween, formatDateCN, formatTime, toDateKey } from '@/utils/date'

const props = defineProps({
  note: { type: Object, required: true },
})

const router = useRouter()
const ws = useWorkspaceStore()
const cal = useCalendarStore()
const title = ref(props.note.title)
const autoSave = ref(true)
const outlineOpen = ref(true)
const addMenuOpen = ref(false)
const addMenuRoot = ref(null)

const blocks = computed(() => ws.blocksOf(props.note.id))
const headings = computed(() => blocks.value.filter((block) => block.block_type === 'heading' && block.content))

const blockTypes = [
  { key: 'text', label: '文本', icon: 'type' },
  { key: 'todo', label: '待办', icon: 'square-check' },
  { key: 'heading', label: '标题', icon: 'heading' },
  { key: 'quote', label: '引用', icon: 'quote' },
  { key: 'bullet', label: '项目符号', icon: 'list' },
  { key: 'divider', label: '分割线', icon: 'minus' },
]

const updatedLabel = computed(() => {
  const raw = props.note.updated_at || props.note.created_at || ''
  if (!raw) return ''
  const key = toDateKey(new Date(raw))
  if (key === TODAY_KEY) return `今天 ${formatTime(raw)} 更新`
  if (daysBetween(key, TODAY_KEY) === 1) return `昨天 ${formatTime(raw)} 更新`
  return `${formatDateCN(key)} 更新`
})

const authorName = computed(() => ws.user?.name || '林悦')
const authorInitial = computed(() => ws.user?.short_name || authorName.value.slice(0, 1))

/** 相关笔记：按共同标签挑选待办 / 日程 / 笔记各一条 */
const relatedItems = computed(() => {
  const tagIds = (props.note.tags || []).map((tag) => tag.id)
  if (!tagIds.length) return []
  const shares = (tags) => (tags || []).some((tag) => tagIds.includes(tag.id))
  const items = []
  const todo = ws.todos.find((entry) => shares(ws.todoTags[entry.id]))
  if (todo) items.push({ kind: 'todo', icon: 'square-check', label: '待办', title: todo.title, id: todo.id })
  const event = cal.entries.find((entry) => entry.type === 'event' && shares(cal.details[entry.id]?.tags))
  if (event) items.push({ kind: 'event', icon: 'calendar', label: '日程', title: event.title, id: event.id })
  const note = ws.notes.find((item) => item.id !== props.note.id && shares(item.tags))
  if (note) items.push({ kind: 'note', icon: 'sticky-note', label: '笔记', title: note.title, id: note.id })
  return items
})

watch(
  () => props.note.id,
  () => {
    title.value = props.note.title
  },
)

watch(
  () => props.note.title,
  (value) => {
    if (value !== title.value) title.value = value
  },
)

onMounted(() => {
  if (!cal.entries.length) cal.load()
  document.addEventListener('mousedown', onDocumentClick)
})
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick))

const saveTitle = async () => {
  const next = title.value.trim() || '未命名笔记'
  title.value = next
  if (next === props.note.title) return
  await updateEntry(props.note.id, { title: next })
  await ws.loadNotes()
}

const updateBlock = (block, content) => {
  ws.updateBlock({ id: block.id, content })
}

const toggleBlock = (block) => {
  ws.updateBlock({ id: block.id, checked: !block.checked })
}

/** 整条笔记导入 / 移出待办中心（保持笔记原样，仅在待办列表多展示一行） */
const toggleImportToTodos = async () => {
  if (props.note.imported_to_todos) {
    await removeFromTodos(props.note.id)
    ws.showToast('已从待办中心移除')
  } else {
    await importToTodos(props.note.id)
    ws.showToast(`已导入到待办中心：${props.note.title}`)
  }
  await ws.loadNotes()
}

const openPicker = (list) => {
  const items = list
    .filter((block) => block.content.trim())
    .map((block) => ({ content: block.content.trim(), checked: false, blockId: block.id }))
  if (!items.length) {
    ws.showToast('当前笔记没有可导入的任务')
    return
  }
  ws.openListPicker({ noteId: props.note.id, noteTitle: props.note.title, tasks: items })
}

const addBlock = async (blockType, afterId = null) => {
  addMenuOpen.value = false
  await ws.addBlock({ noteId: props.note.id, blockType, afterId })
}

const scrollToBlock = (blockId) => {
  document.getElementById(`note-block-${blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const selectRelated = (item) => {
  if (item.kind === 'note') {
    router.push(`/notes/${item.id}`)
    return
  }
  cal.openEntry(item.id)
}

const onDocumentClick = (event) => {
  if (!addMenuOpen.value) return
  if (addMenuRoot.value && !addMenuRoot.value.contains(event.target)) {
    addMenuOpen.value = false
  }
}
</script>

<template>
  <section class="note">
    <header class="note__bar">
      <div class="note__crumb">
        <span class="note__crumb-root">备忘笔记</span>
        <AppIcon name="chevron-right" :size="12" class="note__crumb-sep" />
        <span class="note__crumb-name">{{ note.title }}</span>
        <AppIcon name="chevron-right" :size="12" class="note__crumb-sep" />
        <span class="note__crumb-state">已保存</span>
      </div>

      <div class="note__actions">
        <button class="note__autosave" type="button" @click="autoSave = !autoSave">
          <span class="note__switch" :class="{ 'note__switch--on': autoSave }" aria-hidden="true">
            <span class="note__switch-thumb"></span>
          </span>
          自动保存
        </button>
        <button class="note__action" type="button">
          <AppIcon name="share" :size="13" />
          分享
        </button>
        <button
          class="note__action"
          :class="{ 'note__action--active': note.imported_to_todos }"
          type="button"
          @click="toggleImportToTodos"
        >
          <AppIcon name="list-checks" :size="13" />
          {{ note.imported_to_todos ? '已导入待办中心' : '导入待办中心' }}
        </button>
        <button class="note__action" type="button">
          <AppIcon name="history" :size="13" />
          版本记录
        </button>
        <button class="note__icon" type="button" aria-label="更多操作">
          <AppIcon name="ellipsis" :size="17" />
        </button>
        <button class="note__icon" type="button" aria-label="下载笔记">
          <AppIcon name="import" :size="15" />
        </button>
      </div>
    </header>

    <div class="note__body">
      <aside v-if="outlineOpen" class="outline">
        <header class="outline__head">
          <span class="outline__heading">大纲</span>
          <button class="outline__toggle" type="button" aria-label="收起大纲" @click="outlineOpen = false">
            <AppIcon name="panel-left-close" :size="13" />
          </button>
        </header>

        <ul v-if="headings.length" class="outline__list">
          <li v-for="block in headings" :key="block.id">
            <button class="outline__item" type="button" @click="scrollToBlock(block.id)">
              {{ block.content }}
            </button>
          </li>
        </ul>

        <template v-if="relatedItems.length">
          <p class="outline__label">相关笔记</p>
          <ul class="outline__related">
            <li v-for="item in relatedItems" :key="`${item.kind}-${item.id}`">
              <button class="outline__item outline__item--related" type="button" @click="selectRelated(item)">
                <AppIcon :name="item.icon" :size="11" />
                <span>{{ item.label }} · {{ item.title }}</span>
              </button>
            </li>
          </ul>
        </template>

        <p class="outline__label">标签</p>
        <div class="outline__tags">
          <span v-for="tag in note.tags || []" :key="tag.id" class="outline__tag" :style="tagStyle(tag)">
            {{ tag.name }}
          </span>
        </div>
      </aside>

      <button
        v-else
        class="note__outline-open"
        type="button"
        aria-label="展开大纲"
        @click="outlineOpen = true"
      >
        <AppIcon name="panel-left-open" :size="13" />
      </button>

      <div class="note__scroll">
        <article class="doc">
          <div class="doc__heading">
            <input
              v-model="title"
              class="doc__title"
              type="text"
              aria-label="笔记标题"
              @blur="saveTitle"
              @keyup.enter="$event.target.blur()"
            />

            <div class="doc__meta">
              <span v-for="tag in note.tags || []" :key="tag.id" class="doc__tag" :style="tagStyle(tag)">
                {{ tag.name }}
              </span>
              <span v-if="note.tags?.length" class="doc__dot" aria-hidden="true"></span>
              <span class="doc__meta-text">{{ updatedLabel }}</span>
              <span class="doc__dot" aria-hidden="true"></span>
              <span class="doc__author">
                <span class="doc__avatar">{{ authorInitial }}</span>
                {{ authorName }}
              </span>
            </div>
          </div>

          <div class="doc__blocks">
            <NoteBlock
              v-for="block in blocks"
              :id="`note-block-${block.id}`"
              :key="block.id"
              :block="block"
              @update="updateBlock(block, $event)"
              @toggle="toggleBlock(block)"
              @import="openPicker([block])"
              @add-after="addBlock('text', block.id)"
              @remove="ws.removeBlock(block.id)"
            />
          </div>

          <div ref="addMenuRoot" class="doc__add">
            <button class="doc__add-button" type="button" @click="addMenuOpen = !addMenuOpen">
              <AppIcon name="plus" :size="13" />
              添加块
            </button>

            <div v-if="addMenuOpen" class="doc__add-menu">
              <button
                v-for="item in blockTypes"
                :key="item.key"
                class="doc__add-option"
                type="button"
                @click="addBlock(item.key)"
              >
                <AppIcon :name="item.icon" :size="13" />
                {{ item.label }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.note {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.note__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: var(--space-16);
  height: 52px;
  padding: 0 var(--space-20);
  border-bottom: 1px solid var(--color-border);
}

.note__crumb {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  min-width: 0;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.note__crumb-root {
  flex-shrink: 0;
}

.note__crumb-sep {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.note__crumb-name {
  overflow: hidden;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note__crumb-state {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-4);
  background: var(--color-tag-blue-bg);
  font-size: var(--font-size-10);
  color: var(--color-tag-blue-text);
}

.note__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-8);
}

.note__autosave {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.note__switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 28px;
  height: 16px;
  padding: 2px;
  border-radius: var(--radius-full);
  background: #d7dee8;
  transition: background 0.15s ease;
}

.note__switch--on {
  background: var(--color-brand);
}

.note__switch-thumb {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  transition: transform 0.15s ease;
}

.note__switch--on .note__switch-thumb {
  transform: translateX(12px);
}

.note__action {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 28px;
  padding: 0 var(--space-10);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-7);
  background: var(--color-bg-card);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.note__action:hover {
  border-color: var(--color-border-selected);
  color: var(--color-brand);
}

.note__action--active {
  border-color: var(--color-border-selected);
  color: var(--color-brand);
}

.note__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-7);
  color: var(--color-text-secondary);
}

.note__icon:hover {
  background: var(--color-bg-page);
}

.note__body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.outline {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 200px;
  flex-shrink: 0;
  padding: var(--space-16) var(--space-10) var(--space-24);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.outline__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-8) var(--space-6);
}

.outline__heading {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.outline__toggle {
  display: flex;
  color: var(--color-text-muted);
}

.outline__toggle:hover {
  color: var(--color-text-secondary);
}

.outline__list,
.outline__related {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.outline__item {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
  padding: var(--space-5) var(--space-8);
  overflow: hidden;
  border-radius: var(--radius-5);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline__item:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.outline__item--related span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline__label {
  padding: var(--space-12) var(--space-8) var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.outline__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  padding: 0 var(--space-8);
}

.outline__tag {
  padding: var(--space-3) var(--space-7);
  border-radius: var(--radius-4);
  font-size: var(--font-size-10);
}

.note__outline-open {
  position: absolute;
  left: var(--space-6);
  top: var(--space-16);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-5);
  color: var(--color-text-muted);
}

.note__outline-open:hover {
  background: var(--color-bg-page);
}

.note__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-28) var(--space-24) var(--space-48);
}

.doc {
  max-width: 760px;
}

.doc__heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-16);
}

.doc__title {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-26);
  font-weight: var(--font-weight-bold);
  line-height: 1.35;
  color: var(--color-text-primary);
}

.doc__title::placeholder {
  color: var(--color-text-muted);
}

.doc__meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-6);
  padding-top: var(--space-8);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.doc__tag {
  padding: var(--space-3) var(--space-7);
  border-radius: var(--radius-4);
  font-size: var(--font-size-10);
}

.doc__meta-text {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.doc__dot {
  width: 3px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--color-text-muted);
}

.doc__author {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.doc__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-brand-navy);
  font-size: 10px;
  color: var(--color-text-inverse);
}

.doc__blocks {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-20);
}

.doc__add {
  position: relative;
  margin-top: var(--space-12);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.doc:hover .doc__add {
  opacity: 1;
}

.doc__add-button {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: 30px;
  padding: 0 var(--space-10);
  border-radius: var(--radius-7);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.doc__add-button:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.doc__add-menu {
  position: absolute;
  top: 34px;
  left: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  width: 220px;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-10);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
}

.doc__add-option {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 32px;
  padding: 0 var(--space-9);
  border-radius: var(--radius-7);
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.doc__add-option:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
</style>
