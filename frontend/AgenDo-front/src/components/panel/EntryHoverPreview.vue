<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatTime } from '@/utils/date'
import { entryTypeLabel } from '@/utils/tags'

const props = defineProps({
  preview: { type: Object, default: null },
})
defineEmits(['open', 'enter', 'leave', 'toggle'])

const entry = computed(() => props.preview?.entry || null)
const detail = computed(() => props.preview?.detail || null)
const related = computed(() => props.preview?.related || [])

const timeLabel = computed(() => {
  if (!detail.value) return ''
  if (entry.value.type === 'event') return formatTime(detail.value.start_at)
  if (entry.value.type === 'todo') return formatTime(detail.value.due_at)
  return ''
})

const GAP = 10
const MARGIN = 12

const root = ref(null)
const left = ref(props.preview?.x || 0)
const top = ref(props.preview?.y || 0)
let frame = 0

/** 渲染后按实际包围盒收敛到视口内，并保持与条目的间距 */
const clampPosition = () => {
  const anchorEl = props.preview?.anchorEl
  const node = root.value
  if (!anchorEl || !node) return

  const anchor = anchorEl.getBoundingClientRect()
  const width = node.offsetWidth
  const height = node.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = anchor.right + GAP
  if (x + width + MARGIN > viewportWidth) x = anchor.left - GAP - width
  x = Math.min(Math.max(MARGIN, x), Math.max(MARGIN, viewportWidth - width - MARGIN))

  let y = anchor.top - 6
  if (y + height + MARGIN > viewportHeight) y = viewportHeight - height - MARGIN
  y = Math.min(Math.max(MARGIN, y), Math.max(MARGIN, viewportHeight - height - MARGIN))

  left.value = x
  top.value = y
}

const scheduleClamp = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(clampPosition)
}

const position = computed(() => ({
  left: `${left.value}px`,
  top: `${top.value}px`,
}))

watch(
  () => (props.preview?.visible ? props.preview?.entry?.id : null),
  async (id) => {
    if (!id) return
    // 先按 store 的预估位置渲染，再按实际尺寸修正
    left.value = props.preview?.x || 0
    top.value = props.preview?.y || 0
    await nextTick()
    clampPosition()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', scheduleClamp)
  window.addEventListener('scroll', scheduleClamp, true)
  scheduleClamp()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleClamp)
  window.removeEventListener('scroll', scheduleClamp, true)
  cancelAnimationFrame(frame)
})

const relatedTime = (item) => {
  if (item.entry.type === 'event') return formatTime(item.detail?.start_at)
  if (item.entry.type === 'todo') return formatTime(item.detail?.due_at)
  return ''
}
</script>

<template>
  <div
    v-if="preview?.visible && entry"
    ref="root"
    class="preview"
    :style="position"
    @mouseenter="$emit('enter')"
    @mouseleave="$emit('leave')"
    @click="$emit('open', entry.id)"
  >
    <header class="preview__head">
      <span class="preview__type">{{ entryTypeLabel(entry.type) }}</span>
      <span class="preview__title">{{ entry.title }}</span>
      <span v-if="timeLabel" class="preview__time">{{ timeLabel }}</span>
    </header>

    <span class="preview__divider" aria-hidden="true"></span>

    <div v-if="related.length" class="preview__related">
      <template v-for="item in related" :key="item.entry.id">
        <span v-if="item.entry.type === 'todo'" class="preview__todo">
          <button
            class="preview__checkbox"
            :class="{ 'preview__checkbox--done': item.entry.completion_status === 'completed' }"
            type="button"
            :aria-label="item.entry.completion_status === 'completed' ? `标记「${item.entry.title}」为未完成` : `标记「${item.entry.title}」为已完成`"
            @click.stop="$emit('toggle', item.entry.id)"
          >
            <AppIcon
              v-if="item.entry.completion_status === 'completed'"
              name="check"
              :size="8"
              :stroke-width="2.6"
            />
          </button>
          <span
            class="preview__todo-title"
            :class="{ 'preview__todo-title--done': item.entry.completion_status === 'completed' }"
          >
            {{ item.entry.title }}
          </span>
        </span>
        <span v-else-if="item.entry.type === 'note'" class="preview__note">
          <AppIcon name="file-text" :size="11" />
          <span>{{ item.entry.title }}</span>
        </span>
        <span v-else class="preview__event">
          <span class="preview__event-dot" aria-hidden="true"></span>
          <span>{{ item.entry.title }}</span>
          <span class="preview__event-time">{{ relatedTime(item) }}</span>
        </span>
      </template>
    </div>

    <p v-if="entry.description" class="preview__desc" v-html="entry.description"></p>
  </div>
</template>

<style scoped>
.preview {
  position: fixed;
  z-index: 35;
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
  width: var(--hover-preview-width);
  padding: var(--space-12);
  border-radius: var(--radius-10);
  background: #fdfdfe;
  box-shadow: var(--shadow-hover);
  cursor: pointer;
}

.preview__head {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  min-width: 0;
}

.preview__type {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-4);
  background: var(--color-tag-purple-bg);
  font-size: var(--font-size-10);
  line-height: 1.3;
  color: var(--color-tag-purple-text);
}

.preview__title {
  overflow: hidden;
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__time {
  flex-shrink: 0;
  margin-left: auto;
  font-size: var(--font-size-10);
  color: #97a5b4;
}

.preview__divider {
  height: 1px;
  background: #eff3f8;
}

.preview__related {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.preview__todo {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  min-width: 0;
}

.preview__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #a3b6ca;
  border-radius: var(--radius-3);
  background: var(--color-bg-card);
  cursor: pointer;
}

.preview__checkbox--done {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.preview__todo-title {
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__todo-title--done {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.preview__note {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-4) var(--space-6);
  overflow: hidden;
  border-radius: var(--radius-5);
  background: #fbf3e3;
  font-size: var(--font-size-11);
  color: var(--color-tag-amber-text);
  white-space: nowrap;
}

.preview__note span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview__event {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.preview__event-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-text-link);
  opacity: 0.55;
}

.preview__event-time {
  margin-left: auto;
  font-size: var(--font-size-10);
  color: #97a5b4;
}

.preview__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--font-size-11);
  line-height: 17px;
  color: #778596;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
