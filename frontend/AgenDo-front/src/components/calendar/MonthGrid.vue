<script setup>
import DayCell from './DayCell.vue'
import { WEEKDAY_LABELS } from '@/utils/date'

defineProps({
  cells: { type: Array, default: () => [] },
  entriesByDate: { type: Object, default: () => ({}) },
  details: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
defineEmits(['select', 'add', 'hover', 'leave', 'toggle-todo'])
</script>

<template>
  <section class="month-grid" :class="{ 'month-grid--loading': loading }">
    <header class="month-grid__weekdays">
      <span v-for="label in WEEKDAY_LABELS" :key="label" class="month-grid__weekday">{{ label }}</span>
    </header>
    <div class="month-grid__body">
      <DayCell
        v-for="cell in cells"
        :key="cell.key"
        :cell="cell"
        :entries="entriesByDate[cell.key] || []"
        :details="details"
        @select="$emit('select', $event)"
        @add="$emit('add', $event)"
        @hover="(entry, event) => $emit('hover', entry, event)"
        @leave="$emit('leave')"
        @toggle-todo="$emit('toggle-todo', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.month-grid {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.month-grid--loading {
  opacity: 0.6;
}

.month-grid__weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  flex-shrink: 0;
  height: var(--weekday-height);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.month-grid__weekday {
  display: flex;
  align-items: center;
  padding-left: var(--space-14);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.month-grid__body {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  flex: 1;
  gap: 1px;
  min-height: 0;
  background: var(--color-border);
}
</style>
