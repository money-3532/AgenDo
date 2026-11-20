<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import TooltipText from '@/components/ui/TooltipText.vue'
import { formatDateWithWeekday, formatTime } from '@/utils/date'
import { tagStyle } from '@/utils/tags'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  details: { type: Object, default: () => ({}) },
})
defineEmits(['select', 'hover', 'leave', 'remove-import'])

const typeIcon = (type) => {
  if (type === 'event') return 'calendar'
  if (type === 'todo') return 'square-check'
  return 'notebook-pen'
}

const timeOf = (entry) => {
  const detail = props.details[entry.id]
  if (!detail) return ''
  if (entry.type === 'event') return formatTime(detail.start_at)
  if (entry.type === 'todo') return formatTime(detail.due_at)
  return ''
}
</script>

<template>
  <section class="list-board">
    <section v-for="group in groups" :key="group.dateKey" class="list-group">
      <header class="list-group__head">
        <span class="list-group__date">{{ formatDateWithWeekday(group.dateKey) }}</span>
        <span class="list-group__line" aria-hidden="true"></span>
        <span class="list-group__count">{{ group.entries.length }} 项</span>
      </header>

      <ul class="list-group__items">
        <li v-for="entry in group.entries" :key="entry.id" class="list-group__row">
          <button
            class="list-entry"
            type="button"
            @click="$emit('select', entry.id)"
            @mouseenter="$emit('hover', entry, $event)"
            @mouseleave="$emit('leave')"
          >
            <span class="list-entry__time">{{ timeOf(entry) }}</span>
            <span class="list-entry__icon" :class="`list-entry__icon--${entry.type}`">
              <AppIcon :name="typeIcon(entry.type)" :size="13" />
            </span>
            <TooltipText
              class="list-entry__title"
              :class="{ 'list-entry__title--done': entry.completion_status === 'completed' }"
              :text="entry.title"
            />
            <span class="list-entry__tags">
              <span v-for="tag in details[entry.id]?.tags || []" :key="tag.id" class="list-entry__tag" :style="tagStyle(tag)">
                {{ tag.name }}
              </span>
            </span>
            <span class="list-entry__status">
              <AppIcon v-if="entry.completion_status === 'completed'" name="check" :size="13" />
              <AppIcon v-else name="chevron-right" :size="14" />
            </span>
          </button>
          <button
            v-if="entry.type !== 'event'"
            class="list-entry__remove"
            type="button"
            aria-label="从日程移除"
            title="从日程移除该导入"
            @click.stop="$emit('remove-import', { entry, dateKey: group.dateKey })"
          >
            <AppIcon name="x" :size="11" />
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.list-board {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-20);
  min-height: 0;
  padding: var(--space-24);
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.list-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.list-group__head {
  display: flex;
  align-items: center;
  gap: var(--space-10);
}

.list-group__date {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.list-group__line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.list-group__count {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.list-group__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.list-entry {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  width: 100%;
  height: 38px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-8);
  text-align: left;
}

.list-entry:hover {
  background: var(--color-bg-page);
}

.list-entry__time {
  width: 38px;
  flex-shrink: 0;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.list-entry__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
}

.list-entry__icon--event {
  background: var(--color-tag-blue-bg);
  color: var(--color-tag-blue-text);
}

.list-entry__icon--todo {
  background: var(--color-tag-amber-bg);
  color: var(--color-tag-amber-text);
}

.list-entry__icon--note {
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.list-entry__title {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-13);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-entry__title--done {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.list-entry__tags {
  display: flex;
  gap: var(--space-4);
}

.list-entry__tag {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-4);
  font-size: var(--font-size-10);
  line-height: var(--line-height-base);
}

.list-entry__status {
  display: flex;
  color: var(--color-text-muted);
}

.list-group__row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.list-group__row .list-entry {
  flex: 1;
  min-width: 0;
}

.list-entry__remove {
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

.list-group__row:hover .list-entry__remove {
  opacity: 1;
}

.list-entry__remove:hover {
  color: var(--color-danger);
  background: var(--color-bg-page);
}
</style>
