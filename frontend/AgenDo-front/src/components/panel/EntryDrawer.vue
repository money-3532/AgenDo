<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { formatDateCN, formatDateWithWeekday, formatTime, TODAY_KEY } from '@/utils/date'
import { entryTypeLabel } from '@/utils/tags'

const ws = useWorkspaceStore()

const props = defineProps({
  entry: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits([
  'close',
  'save',
  'delete',
  'pick-related',
  'pick-note',
  'remove-related',
])

const timeOpen = ref(true)
const descRef = ref(null)
const toolbar = [
  { icon: 'bold', command: 'bold', label: '加粗' },
  { icon: 'italic', command: 'italic', label: '斜体' },
  { icon: 'underline', command: 'underline', label: '下划线' },
]

const REPEAT_OPTIONS = [
  { value: 'none', label: '不重复' },
  { value: 'weekly', label: '每周重复' },
  { value: 'monthly', label: '每月重复' },
]

const PRIORITY_OPTIONS = [
  { value: 'important', label: '重要' },
  { value: 'urgent', label: '紧急' },
  { value: 'normal', label: '常规' },
  { value: 'later', label: '可延后' },
]

const REMINDER_OPTIONS = [
  { value: 0, label: '无提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
]

const draft = reactive({
  title: '',
  description: '',
  isAllDay: false,
  completed: false,
  tags: [],
  dateLabel: '',
  dateShort: '',
  timeLabel: '',
  dateKey: '',
  repeatLabel: '不重复',
  reminderLabel: '提前 15 分钟',
  dateValue: TODAY_KEY,
  startTime: '09:00',
  endTime: '10:00',
  repeatValue: 'none',
  reminderValue: 15,
  priority: 'normal',
})

/** 把 entry.related_refs 解析成完整条目（混排待办+笔记） */
const relatedItems = computed(() => {
  const refs = props.entry?.related_refs || []
  return refs
    .map((ref) => {
      if (ref.type === 'todo') {
        const item = ws.todos.find((t) => t.id === ref.id)
        return item ? { ...item, refType: 'todo' } : null
      }
      const item = ws.notes.find((n) => n.id === ref.id)
      return item ? { ...item, refType: 'note' } : null
    })
    .filter(Boolean)
})

const typeIcon = computed(() => {
  if (!props.entry) return 'calendar'
  if (props.entry.type === 'todo') return 'square-check'
  if (props.entry.type === 'note') return 'notebook-pen'
  return 'calendar'
})

const headTitle = computed(() => {
  if (!props.entry) return ''
  if (props.entry.type === 'todo') return '编辑待办'
  if (props.entry.type === 'note') return '编辑备忘'
  return '编辑日程'
})

const titlePlaceholder = computed(() => {
  if (props.entry?.type === 'todo') return '请输入待办标题'
  if (props.entry?.type === 'note') return '请输入笔记标题'
  return '请输入日程标题'
})

const dateLabel = computed(() => (props.entry?.type === 'todo' ? '截止日期' : '日期'))
const clockLabel = computed(() => (props.entry?.type === 'todo' ? '提醒时间' : '时间'))

const savedLabel = computed(() => {
  const raw = props.entry?.updated_at
  if (!raw || props.entry?.id === 'draft') return '尚未保存'
  return `上次保存于 ${formatTime(raw)}`
})

watch(
  () => props.entry,
  (entry) => {
    if (!entry) return
    const detail = entry.detail || {}
    const base = detail.start_at || detail.due_at || entry.created_at
    draft.title = entry.title
    draft.description = entry.description || detail.content_text || ''
    draft.isAllDay = Boolean(detail.is_all_day)
    draft.completed = entry.completion_status === 'completed'
    draft.tags = [...(entry.tags || [])]
    draft.dateKey = String(base).slice(0, 10)
    draft.dateLabel = formatDateWithWeekday(draft.dateKey)
    draft.dateShort = formatDateCN(draft.dateKey)
    draft.timeLabel =
      entry.type === 'event'
        ? `${formatTime(detail.start_at)} — ${formatTime(detail.end_at)}`
        : entry.type === 'todo'
          ? formatTime(detail.due_at)
          : ''
    draft.repeatValue = detail.recurrence_rule || 'none'
    draft.repeatLabel = REPEAT_OPTIONS.find((o) => o.value === draft.repeatValue)?.label || '不重复'
    draft.priority = detail.priority || 'normal'
    draft.reminderValue = detail.reminder_minutes ?? 15
    draft.reminderLabel = REMINDER_OPTIONS.find((o) => o.value === draft.reminderValue)?.label || '提前 15 分钟'
    // 同步给可编辑的 input
    draft.dateValue = draft.dateKey || TODAY_KEY
    if (entry.type === 'event') {
      draft.startTime = formatTime(detail.start_at) || '09:00'
      draft.endTime = formatTime(detail.end_at) || '10:00'
    } else if (entry.type === 'todo') {
      draft.startTime = formatTime(detail.due_at) || '18:00'
      draft.endTime = ''
    } else {
      draft.startTime = ''
      draft.endTime = ''
    }
    // 富文本内容同步到 contenteditable div
    nextTick(() => {
      if (descRef.value) {
        descRef.value.innerHTML = draft.description || ''
      }
    })
  },
  { immediate: true },
)

/** 执行富文本格式化命令 */
const applyFormat = (command) => {
  descRef.value?.focus()
  // 默认不分组，避免整段变粗体验不好
  document.execCommand(command, false, null)
  syncDescription()
}

/** 从 contenteditable div 回写 draft.description（保留富文本 HTML） */
const syncDescription = () => {
  if (!descRef.value) return
  draft.description = descRef.value.innerHTML || ''
}

const repeatLabelFromValue = (val) =>
  REPEAT_OPTIONS.find((o) => o.value === val)?.label || '不重复'
const reminderLabelFromValue = (val) =>
  REMINDER_OPTIONS.find((o) => o.value === Number(val))?.label || '提前 15 分钟'

const onRepeatChange = (e) => {
  draft.repeatValue = e.target.value
  draft.repeatLabel = repeatLabelFromValue(draft.repeatValue)
}
const onReminderChange = (e) => {
  draft.reminderValue = Number(e.target.value)
  draft.reminderLabel = reminderLabelFromValue(draft.reminderValue)
}

onBeforeUnmount(() => {
  // 卸载前最后同步一次
  if (descRef.value) syncDescription()
})

const submit = () => {
  syncDescription()
  // 把 draft 里的日期时间同步回 entry.detail（entry 是 store 的响应式引用）
  const entry = props.entry
  if (entry?.detail) {
    if (entry.type === 'event') {
      draft.dateKey = draft.dateValue
      draft.dateLabel = formatDateWithWeekday(draft.dateValue)
      draft.timeLabel = `${draft.startTime} — ${draft.endTime}`
      const startStr = `${draft.dateValue}T${draft.startTime || '09:00'}:00+08:00`
      const endStr = `${draft.dateValue}T${draft.endTime || draft.startTime || '10:00'}:00+08:00`
      entry.detail.start_at = startStr
      entry.detail.end_at = endStr
      entry.detail.recurrence_rule = draft.repeatValue === 'none' ? null : draft.repeatValue
      entry.detail.reminder_minutes = draft.reminderValue
    } else if (entry.type === 'todo') {
      draft.dateKey = draft.dateValue
      draft.dateLabel = formatDateWithWeekday(draft.dateValue)
      draft.timeLabel = draft.startTime
      entry.detail.due_at = `${draft.dateValue}T${draft.startTime || '18:00'}:00+08:00`
      entry.detail.priority = draft.priority
    }
  }

  emit('save', {
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    priority: draft.priority,
    completionStatus: draft.completed ? 'completed' : 'pending',
  })
}
</script>

<template>
  <div v-if="entry" class="drawer-root">
    <div class="drawer-root__mask" @click="$emit('close')"></div>

    <aside class="drawer" role="dialog" aria-modal="true" aria-label="编辑条目">
      <header class="drawer__head">
        <div class="drawer__heading">
          <h2 class="drawer__title">{{ headTitle }}</h2>
          <span class="drawer__subtitle">{{ savedLabel }}</span>
        </div>
        <div class="drawer__actions">
          <button type="button" aria-label="更多操作">
            <AppIcon name="ellipsis" :size="17" />
          </button>
          <button type="button" aria-label="关闭" @click="$emit('close')">
            <AppIcon name="x" :size="17" />
          </button>
        </div>
      </header>

      <div class="drawer__body" :class="{ 'drawer__body--loading': loading }">
        <input v-model="draft.title" class="drawer__name" type="text" aria-label="标题" :placeholder="titlePlaceholder" />

        <div class="drawer__chips">
          <span class="drawer__type" :class="`drawer__type--${entry.type}`">
            <AppIcon :name="typeIcon" :size="12" />
            {{ entryTypeLabel(entry.type) }}
          </span>
          <span class="drawer__spacer" aria-hidden="true"></span>
          <button class="done-toggle" type="button" @click="draft.completed = !draft.completed">
            <span class="done-toggle__box" :class="{ 'done-toggle__box--on': draft.completed }">
              <AppIcon v-if="draft.completed" name="check" :size="9" :stroke-width="2.6" />
            </span>
            标为完成
          </button>
        </div>

        <section class="rich">
          <div class="rich__toolbar" role="toolbar" aria-label="文本格式">
            <button
              v-for="item in toolbar"
              :key="item.icon"
              class="rich__tool"
              type="button"
              :aria-label="item.label"
              @click="applyFormat(item.command)"
            >
              <AppIcon :name="item.icon" :size="14" />
            </button>
          </div>
          <div
            ref="descRef"
            class="rich__input rich__contenteditable"
            contenteditable="true"
            role="textbox"
            aria-label="描述"
            aria-multiline="true"
            @input="syncDescription"
            @blur="syncDescription"
          ></div>
        </section>

        <section v-if="entry.type !== 'note'" class="rules">
          <button class="rules__head" type="button" @click="timeOpen = !timeOpen">
            <span>时间规则</span>
            <AppIcon :name="timeOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
          </button>

          <div v-if="timeOpen" class="rules__list">
            <div class="rule">
              <span class="rule__icon"><AppIcon name="calendar" :size="13" /></span>
              <span class="rule__label">{{ dateLabel }}</span>
              <input v-model="draft.dateValue" class="rule__input" type="date" />
            </div>
            <div class="rule">
              <span class="rule__icon"><AppIcon name="clock" :size="13" /></span>
              <span class="rule__label">{{ clockLabel }}</span>
              <div class="rule__time-range">
                <input v-model="draft.startTime" class="rule__input" type="time" />
                <span v-if="entry.type === 'event'" class="rule__time-sep">—</span>
                <input v-if="entry.type === 'event'" v-model="draft.endTime" class="rule__input" type="time" />
              </div>
            </div>
            <template v-if="entry.type === 'event'">
              <div class="rule">
                <span class="rule__icon"><AppIcon name="repeat" :size="13" /></span>
                <span class="rule__label">重复</span>
                <select class="rule__select" :value="draft.repeatValue" @change="onRepeatChange">
                  <option v-for="opt in REPEAT_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="rule">
                <span class="rule__icon"><AppIcon name="bell" :size="13" /></span>
                <span class="rule__label">提醒</span>
                <select class="rule__select" :value="String(draft.reminderValue)" @change="onReminderChange">
                  <option v-for="opt in REMINDER_OPTIONS" :key="opt.value" :value="String(opt.value)">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </template>
          </div>
        </section>

        <section v-if="entry.type === 'todo'" class="priority">
          <span class="priority__label">优先级</span>
          <div class="priority__row" role="group" aria-label="优先级选择">
            <button
              v-for="option in PRIORITY_OPTIONS"
              :key="option.value"
              class="priority__chip"
              :class="{ 'priority__chip--active': draft.priority === option.value }"
              type="button"
              :aria-pressed="draft.priority === option.value"
              @click="draft.priority = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <section class="related">
          <div class="tags__head">
            <span>关联条目</span>
            <div class="tags__head-actions">
              <button
                class="tags__add"
                type="button"
                aria-label="添加待办"
                title="添加待办"
                @click="$emit('pick-related')"
              >
                <AppIcon name="square-check" :size="12" />
              </button>
              <button
                class="tags__add"
                type="button"
                aria-label="添加备忘"
                title="添加备忘"
                @click="$emit('pick-note')"
              >
                <AppIcon name="file-text" :size="12" />
              </button>
            </div>
          </div>
          <div v-if="relatedItems.length" class="related__list">
            <div v-for="item in relatedItems" :key="`${item.refType}-${item.id}`" class="related__row">
              <span
                class="related__icon"
                :class="item.refType === 'todo' ? 'related__icon--todo' : 'related__icon--note'"
              >
                <AppIcon :name="item.refType === 'todo' ? 'square-check' : 'file-text'" :size="11" />
              </span>
              <span class="related__title">{{ item.title }}</span>
              <button
                type="button"
                class="related__remove"
                @click="$emit('remove-related', { type: item.refType, id: item.id })"
              >
                <AppIcon name="x" :size="9" />
              </button>
            </div>
          </div>
          <span v-else class="tags__empty">还没有关联条目，点右侧按钮添加</span>
        </section>
      </div>

      <footer class="drawer__foot">
        <button class="drawer__delete" type="button" aria-label="删除条目" @click="$emit('delete', entry.id)">
          <AppIcon name="trash" :size="16" />
        </button>
        <span class="drawer__spacer" aria-hidden="true"></span>
        <button class="drawer__cancel" type="button" @click="$emit('close')">取消</button>
        <button class="drawer__save" type="button" @click="submit">保存更改</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.drawer-root__mask {
  position: absolute;
  inset: 0;
  background: var(--color-mask);
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: var(--drawer-width);
  height: 100%;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-drawer);
}

.drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  padding: var(--space-20) var(--space-20) var(--space-12);
}

.drawer__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.drawer__title {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.drawer__subtitle {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.drawer__actions {
  display: flex;
  gap: var(--space-4);
  color: var(--color-text-secondary);
}

.drawer__actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-6);
}

.drawer__actions button:hover {
  background: var(--color-bg-page);
}

.drawer__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-16);
  padding: 0 var(--space-20) var(--space-24);
  overflow-y: auto;
}

.drawer__body--loading {
  opacity: 0.6;
}

.drawer__name {
  width: 100%;
  padding: var(--space-2) 0;
  font-size: var(--font-size-22);
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
  color: var(--color-text-primary);
}

.drawer__chips {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.drawer__type {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 22px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-5);
  font-size: var(--font-size-10);
}

.drawer__type--event {
  background: var(--color-tag-blue-bg);
  color: var(--color-tag-blue-text);
}

.drawer__type--todo {
  background: var(--color-tag-amber-bg);
  color: var(--color-tag-amber-text);
}

.drawer__type--note {
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.drawer__spacer {
  flex: 1;
}

.done-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.done-toggle__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-3);
  color: var(--color-text-inverse);
}

.done-toggle__box--on {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.rich {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.rich__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.rich__tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-5);
  color: var(--color-text-secondary);
}

.rich__tool:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.rich__input {
  display: block;
  width: 100%;
  min-height: 148px;
  padding: var(--space-10) var(--space-12);
  font-size: var(--font-size-12);
  line-height: 1.8;
  color: var(--color-text-primary);
  resize: vertical;
}

.rich__contenteditable {
  outline: none;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.rich__contenteditable:empty::before {
  content: '补充说明、议程或备注…';
  color: var(--color-text-muted);
  pointer-events: none;
}

.rich__contenteditable b,
.rich__contenteditable strong {
  font-weight: var(--font-weight-bold);
}

.rich__contenteditable i,
.rich__contenteditable em {
  font-style: italic;
}

.rich__contenteditable u {
  text-decoration: underline;
}

.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.rules__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.rules__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.rule {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.rule__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
}

.rule__label {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.rule__input {
  height: 30px;
  margin-left: auto;
  padding: 0 var(--space-9);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-7);
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  cursor: pointer;
}

.rule__input:focus {
  outline: none;
  border-color: var(--color-brand);
}

.rule__time-range {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  margin-left: auto;
}

.rule__time-range .rule__input {
  margin-left: 0;
  padding: 0 var(--space-6);
}

.rule__time-sep {
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}

.rule__select {
  height: 30px;
  min-width: 120px;
  margin-left: auto;
  padding: 0 var(--space-8);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-7);
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  cursor: pointer;
  appearance: auto;
}

.rule__select:focus {
  outline: none;
  border-color: var(--color-brand);
}

.linked {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.tags__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.tags__add {
  display: flex;
  color: var(--color-text-muted);
}

.tags__add:hover {
  color: var(--color-text-secondary);
}

.tags__empty {
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}

.tags__head-actions {
  display: flex;
  gap: var(--space-4);
}

.priority {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.priority__label {
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.priority__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.priority__chip {
  padding: var(--space-4) var(--space-10);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-5);
  background: var(--color-bg-card);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.priority__chip--active {
  border-color: var(--color-brand);
  background: #eef3f8;
  font-weight: var(--font-weight-medium);
  color: var(--color-brand);
}

.related {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.related__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.related__row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-8);
  background: var(--color-bg-page);
}

.related__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
}

.related__icon--todo {
  background: var(--color-tag-amber-bg);
  color: var(--color-tag-amber-text);
}

.related__icon--note {
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.related__title {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: var(--radius-4);
  color: var(--color-text-muted);
  opacity: 0.6;
}

.related__remove:hover {
  background: var(--color-border);
  color: #b45454;
  opacity: 1;
}

.linked__row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-8);
  background: var(--color-tag-amber-bg);
}

.linked__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-tag-amber-text);
}

.linked__title {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-tag-amber-text);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.linked__arrow {
  color: var(--color-tag-amber-text);
}

.drawer__foot {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-shrink: 0;
  height: 64px;
  padding: 0 var(--space-20);
  border-top: 1px solid var(--color-border);
}

.drawer__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radius-7);
  color: var(--color-text-secondary);
}

.drawer__delete:hover {
  background: var(--color-bg-page);
  color: #b45454;
}

.drawer__cancel {
  width: 72px;
  height: 32px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-7);
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.drawer__save {
  height: 32px;
  padding: 0 var(--space-16);
  border-radius: var(--radius-7);
  background: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.drawer__save:hover {
  background: #4c6d90;
}
</style>
