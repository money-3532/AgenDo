<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatTime } from '@/utils/date'
import { tagStyle } from '@/utils/tags'

const props = defineProps({
  days: { type: Array, default: () => [] },
  entriesByDate: { type: Object, default: () => ({}) },
  details: { type: Object, default: () => ({}) },
  variant: { type: String, default: 'week' },
})
const emit = defineEmits(['select', 'hover', 'leave', 'add', 'toggle-todo'])

const START_HOUR = 0
const END_HOUR = 24
const HOUR_HEIGHT = 64

const hours = computed(() =>
  Array.from({ length: END_HOUR - START_HOUR }, (_, index) => {
    const hour = START_HOUR + index
    return { hour, label: `${String(hour).padStart(2, '0')}:00` }
  }),
)

const bodyHeight = computed(() => (END_HOUR - START_HOUR) * HOUR_HEIGHT + 24)

const eventsOf = (dayKey) => (props.entriesByDate[dayKey] || []).filter((entry) => entry.type === 'event')

const todosOf = (dayKey) => (props.entriesByDate[dayKey] || []).filter((entry) => entry.type === 'todo')

const root = ref(null)
const activeByDay = ref({})
const scrollPending = new WeakSet()

/** 取列表垂直中心最近的待办，作为放大且可点击的条目 */
const updateActive = (list) => {
  if (!list) return
  const key = list.dataset.day
  const center = list.scrollTop + list.clientHeight / 2
  let nearest = null
  let nearestDist = Infinity
  list.querySelectorAll('.bucket__item').forEach((item) => {
    const itemCenter = item.offsetTop + item.offsetHeight / 2
    const dist = Math.abs(itemCenter - center)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = item
    }
  })
  const id = nearest?.dataset.entryId
  if (id && activeByDay.value[key] !== id) {
    activeByDay.value = { ...activeByDay.value, [key]: id }
  }
}

const onBucketScroll = (event) => {
  const list = event.currentTarget
  if (scrollPending.has(list)) return
  scrollPending.add(list)
  requestAnimationFrame(() => {
    scrollPending.delete(list)
    updateActive(list)
  })
}

const refreshActive = () => {
  root.value?.querySelectorAll('.bucket__list').forEach(updateActive)
}

const isActive = (dayKey, id) => activeByDay.value[dayKey] === id

const openTodo = (dayKey, id) => {
  if (isActive(dayKey, id)) emit('select', id)
}

onMounted(() => nextTick(refreshActive))
watch(() => props.entriesByDate, () => nextTick(refreshActive))

const spanTop = (detail) => {
  const start = new Date(detail.start_at)
  return (start.getHours() + start.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT
}

const spanHeight = (detail) => {
  const start = new Date(detail.start_at)
  const end = new Date(detail.end_at)
  const minutes = (end - start) / 60000
  return Math.max(22, (minutes / 60) * HOUR_HEIGHT)
}

const eventStyle = (entry) => {
  const detail = props.details[entry.id]
  if (!detail) return {}
  return {
    top: `${Math.max(0, spanTop(detail))}px`,
    height: `${spanHeight(detail)}px`,
    ...(props.details[entry.id]?.tags?.[0] ? tagStyle(props.details[entry.id].tags[0]) : {}),
  }
}

const isCompact = (entry) => {
  const detail = props.details[entry.id]
  return detail ? spanHeight(detail) < 40 : false
}

const timeRange = (entry) => {
  const detail = props.details[entry.id]
  if (!detail) return ''
  return `${formatTime(detail.start_at)} — ${formatTime(detail.end_at)}`
}

const onColumnClick = (dayKey, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const offset = event.clientY - rect.top
  const hour = Math.min(END_HOUR - 1, START_HOUR + Math.floor(offset / HOUR_HEIGHT))
  emit('add', { dateKey: dayKey, hour })
}
</script>

<template>
  <section ref="root" class="time-grid" :class="`time-grid--${variant}`">
    <header class="time-grid__head">
      <span class="time-grid__gutter"></span>
      <div
        v-for="day in days"
        :key="day.key"
        class="time-grid__day"
        :class="{ 'time-grid__day--today': day.isToday, 'time-grid__day--outside': day.isOutside }"
      >
        <span class="time-grid__weekday">{{ day.isToday ? '今天' : day.weekday }}</span>
        <span class="time-grid__date" :class="{ 'time-grid__date--today': day.isToday }">{{ day.day }}</span>
      </div>
    </header>

    <div class="time-grid__body">
      <div class="time-grid__hours" :style="{ height: `${bodyHeight}px` }">
        <span
          v-for="hour in hours"
          :key="hour.hour"
          class="time-grid__hour"
          :style="{ top: `${(hour.hour - START_HOUR) * HOUR_HEIGHT}px` }"
        >{{ hour.label }}</span>
      </div>

      <div class="time-grid__columns">
        <div
          v-for="day in days"
          :key="day.key"
          class="time-grid__column"
          :style="{ height: `${bodyHeight}px` }"
          @click="onColumnClick(day.key, $event)"
        >
          <button
            v-for="entry in eventsOf(day.key)"
            :key="entry.id"
            class="event-block"
            :class="{ 'event-block--compact': isCompact(entry) }"
            :style="eventStyle(entry)"
            type="button"
            @click.stop="$emit('select', entry.id)"
            @mouseenter="$emit('hover', entry, $event)"
            @mouseleave="$emit('leave')"
          >
            <template v-if="isCompact(entry)">
              <span class="event-block__title">{{ entry.title }}</span>
            </template>
            <template v-else>
              <span class="event-block__time">{{ timeRange(entry) }}</span>
              <span class="event-block__title">{{ entry.title }}</span>
              <span v-if="variant === 'day' && entry.description" class="event-block__desc" v-html="entry.description"></span>
            </template>
          </button>
        </div>
      </div>
    </div>

    <div v-if="variant === 'week' || variant === 'day'" class="bucket-row">
      <div class="bucket-row__gutter">
        <span class="bucket-row__label">{{ variant === 'day' ? '今日待办桶' : '每日待办桶' }}</span>
      </div>
      <div class="bucket-row__columns">
        <div
          v-for="day in days"
          :key="day.key"
          class="bucket-cell"
          :class="{ 'bucket-cell--today': day.isToday }"
        >
          <div
            class="bucket"
            role="group"
            tabindex="0"
            :aria-label="`${day.isToday ? '今天' : day.weekday}待办列表`"
          >
            <span class="bucket__weekday">{{ day.isToday ? '今天' : day.weekday }}</span>
            <div
              class="bucket__list"
              :data-day="day.key"
              :aria-label="`${day.isToday ? '今天' : day.weekday}待办列表`"
              @scroll.passive="onBucketScroll"
            >
              <div
                v-for="entry in todosOf(day.key)"
                :key="entry.id"
                class="bucket__item"
                :class="{
                  'bucket__item--done': entry.completion_status === 'completed',
                  'bucket__item--active': isActive(day.key, entry.id),
                }"
                role="button"
                :tabindex="isActive(day.key, entry.id) ? 0 : -1"
                :data-entry-id="entry.id"
                :title="entry.title"
                @click="openTodo(day.key, entry.id)"
                @keydown.enter.prevent="openTodo(day.key, entry.id)"
              >
                <button
                  class="bucket__checkbox"
                  type="button"
                  :aria-label="entry.completion_status === 'completed' ? `标记「${entry.title}」为未完成` : `标记「${entry.title}」为已完成`"
                  @click.stop="$emit('toggle-todo', entry.id)"
                >
                  <AppIcon v-if="entry.completion_status === 'completed'" name="check" :size="9" :stroke-width="2.6" />
                </button>
                <span class="bucket__title">{{ entry.title }}</span>
              </div>
              <span v-if="!todosOf(day.key).length" class="bucket__empty">暂无待办</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.time-grid {
  --hour-height: 64px;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.time-grid__head {
  display: flex;
  flex-shrink: 0;
  height: 52px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.time-grid__gutter {
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
}

.time-grid__day {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  border-left: 1px solid var(--color-border);
}

.time-grid__day:first-of-type {
  border-left: none;
}

.time-grid__weekday {
  font-size: var(--font-size-10);
  line-height: 1;
  color: var(--color-text-secondary);
}

.time-grid__date {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  color: var(--color-text-primary);
}

.time-grid__date--today {
  min-width: 24px;
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.time-grid__day--today .time-grid__weekday {
  color: var(--color-brand);
}

.time-grid__day--outside {
  opacity: 0.65;
}

.time-grid__body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.time-grid__hours {
  position: relative;
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
}

.time-grid__hour {
  position: absolute;
  left: 0;
  width: 100%;
  padding-right: var(--space-8);
  font-size: var(--font-size-10);
  line-height: 1;
  color: var(--color-text-muted);
  text-align: right;
  transform: translateY(-5px);
}

.time-grid__hour:first-child {
  transform: none;
}

.time-grid__columns {
  display: flex;
  flex: 1;
  min-width: 0;
}

.time-grid__column {
  position: relative;
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--color-border);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--color-border) 0,
    var(--color-border) 1px,
    transparent 1px,
    transparent var(--hour-height)
  );
}

.time-grid__column:first-child {
  border-left: none;
}

.event-block {
  position: absolute;
  left: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-7);
  overflow: hidden;
  border-radius: var(--radius-6);
  background: var(--color-tag-blue-bg);
  text-align: left;
  color: var(--color-tag-blue-text);
}

.event-block:hover {
  filter: brightness(0.97);
}

.event-block--compact {
  flex-direction: row;
  align-items: center;
  padding: 0 var(--space-7);
}

.event-block__time {
  font-size: var(--font-size-10);
  line-height: 1.2;
  opacity: 0.85;
}

.event-block__title {
  overflow: hidden;
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-block__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--font-size-10);
  line-height: 1.5;
  color: var(--color-text-secondary);
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.bucket-row {
  display: flex;
  flex-shrink: 0;
  height: 152px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-page);
}

.bucket-row__gutter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  flex-shrink: 0;
  padding: var(--space-8) var(--space-4);
  border-right: 1px solid var(--color-border);
}

.bucket-row__label {
  font-size: var(--font-size-10);
  line-height: 1.4;
  color: var(--color-text-muted);
  text-align: center;
}

.bucket-row__columns {
  display: flex;
  flex: 1;
  min-width: 0;
}

.bucket-cell {
  flex: 1;
  min-width: 0;
  padding: var(--space-6);
  border-left: 1px solid var(--color-border);
}

.bucket-cell:first-child {
  border-left: none;
}

.bucket {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: var(--space-6) var(--space-8) var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  background: var(--color-bg-card);
}

.bucket-cell--today .bucket {
  border-color: var(--color-border-today);
}

.bucket__weekday {
  flex-shrink: 0;
  margin-bottom: var(--space-4);
  font-size: var(--font-size-10);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  color: var(--color-text-secondary);
}

.bucket-cell--today .bucket__weekday {
  color: var(--color-brand);
}

.bucket__list {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  padding: var(--space-28) var(--space-8);
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y proximity;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.bucket__list::-webkit-scrollbar {
  display: none;
}

.bucket__item {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-6);
  width: 100%;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-6);
  background: transparent;
  text-align: left;
  scroll-snap-align: center;
  opacity: 0.55;
  transform: scale(0.92);
  transition: transform 0.16s ease, opacity 0.16s ease, background-color 0.16s ease;
}

.bucket__item--active {
  background: var(--color-bg-page);
  cursor: pointer;
  opacity: 1;
  transform: scale(1.06);
}

.bucket__checkbox {
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

.bucket__title {
  overflow: hidden;
  font-size: var(--font-size-11);
  line-height: 1.3;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket__item--done .bucket__checkbox {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.bucket__item--done .bucket__title {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.bucket__empty {
  font-size: var(--font-size-10);
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
