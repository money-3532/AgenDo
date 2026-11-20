<script setup>
import { computed, ref } from 'vue'
import EventChip from './EventChip.vue'
import TodoItem from './TodoItem.vue'
import NoteSticker from './NoteSticker.vue'

const props = defineProps({
  cell: { type: Object, required: true },
  entries: { type: Array, default: () => [] },
  details: { type: Object, default: () => ({}) },
})
defineEmits(['select', 'add', 'hover', 'leave', 'toggle-todo'])

const itemsRef = ref(null)
const progress = computed(() => Math.min(100, props.entries.length * 18 + 10))

/** 格子内条目区独立滚动：悬停整格时滚轮只滚这里 */
const onWheel = (event) => {
  const node = itemsRef.value
  if (!node || node.scrollHeight <= node.clientHeight) return
  event.preventDefault()
  const step = event.deltaMode === 1 ? 16 : 1
  node.scrollTop += event.deltaY * step
}

/** 格子底部进度条颜色跟随第一个条目的标签 / 类型 */
const progressColor = computed(() => {
  const first = props.entries[0]
  if (!first) return 'var(--color-progress-fill)'
  const tag = props.details[first.id]?.tags?.[0]
  if (tag) return tag.color
  if (first.type === 'note') return 'var(--color-tag-amber-text)'
  if (first.type === 'todo') return 'var(--color-brand)'
  return 'var(--color-text-link)'
})

const tagOf = (entry) => props.details[entry.id]?.tags?.[0] || null
</script>

<template>
  <div
    class="day-cell"
    :class="{
      'day-cell--outside': cell.isOutside,
      'day-cell--today': cell.isToday,
    }"
    @click="$emit('add', cell.key)"
    @wheel="onWheel"
  >
    <header class="day-cell__head">
      <span class="day-cell__date">{{ cell.day }}</span>
      <span v-if="cell.isOutside && cell.day === 1" class="day-cell__month">{{ cell.month }}月</span>
      <span class="day-cell__spacer" aria-hidden="true"></span>
      <span v-if="cell.isToday" class="day-cell__today">今天</span>
    </header>

    <span class="day-cell__track" aria-hidden="true">
      <span class="day-cell__fill" :style="{ width: `${progress}%`, background: progressColor }"></span>
    </span>

    <div ref="itemsRef" class="day-cell__items">
      <template v-for="entry in entries" :key="entry.id">
        <EventChip
          v-if="entry.type === 'event'"
          :entry="entry"
          :detail="details[entry.id]"
          :tag="tagOf(entry)"
          @select="$emit('select', $event)"
          @hover="(_, event) => $emit('hover', entry, event)"
          @leave="$emit('leave')"
        />
        <TodoItem
          v-else-if="entry.type === 'todo'"
          :entry="entry"
          @select="$emit('select', $event)"
          @hover="(_, event) => $emit('hover', entry, event)"
          @leave="$emit('leave')"
          @toggle="$emit('toggle-todo', $event)"
        />
        <NoteSticker
          v-else
          :entry="entry"
          @select="$emit('select', $event)"
          @hover="(_, event) => $emit('hover', entry, event)"
          @leave="$emit('leave')"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.day-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  min-height: 0;
  padding: var(--space-9) var(--space-12) var(--space-8);
  overflow: hidden;
  background: var(--color-bg-card);
}

.day-cell--outside {
  background: var(--color-bg-cell);
}

.day-cell--outside .day-cell__date {
  color: var(--color-text-muted);
}

.day-cell--today {
  background: var(--color-bg-today);
  box-shadow: inset 0 0 0 1px var(--color-border-today);
}

.day-cell__head {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  min-height: var(--cell-date-size);
}

.day-cell__date {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cell-date-size);
  height: var(--cell-date-size);
  border-radius: var(--radius-full);
  font-size: var(--font-size-13);
  line-height: 1;
  color: var(--color-text-primary);
}

.day-cell--today .day-cell__date {
  background: var(--color-brand);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.day-cell__month {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.day-cell__spacer {
  flex: 1;
}

.day-cell__today {
  font-size: var(--font-size-10);
  color: var(--color-brand);
  white-space: nowrap;
}

.day-cell__track {
  display: block;
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: var(--radius-2);
  background: var(--color-progress-track);
}

.day-cell__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-2);
  opacity: 0.55;
}

.day-cell__items {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(85, 120, 158, 0.24) transparent;
}

/* 条目高度固定，条目过多时只滚动不压缩 */
.day-cell__items > * {
  flex: 0 0 auto;
}

.day-cell__items::-webkit-scrollbar {
  width: 4px;
}

.day-cell__items::-webkit-scrollbar-track {
  background: transparent;
}

.day-cell__items::-webkit-scrollbar-thumb {
  border-radius: var(--radius-2);
  background: rgba(85, 120, 158, 0.2);
}

.day-cell__items::-webkit-scrollbar-thumb:hover {
  background: rgba(85, 120, 158, 0.34);
}
</style>
