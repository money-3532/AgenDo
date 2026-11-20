<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({
  overview: { type: Object, default: null },
})

const percent = computed(() => {
  if (!props.overview || !props.overview.todo_count) return 0
  return Math.round((props.overview.todo_completed / props.overview.todo_count) * 100)
})
</script>

<template>
  <div v-if="overview" class="overview">
    <AppIcon name="chart" :size="16" class="overview__icon" />
    <span class="overview__title">{{ overview.range_label }}</span>
    <span class="overview__count">{{ overview.event_count }} 项日程</span>
    <span class="overview__separator" aria-hidden="true">·</span>
    <span class="overview__count">{{ overview.todo_count }} 项待办</span>
    <span class="overview__separator" aria-hidden="true">·</span>
    <span class="overview__count">{{ overview.note_count }} 篇备忘</span>
    <span class="overview__spacer" aria-hidden="true"></span>
    <span class="overview__progress-text">
      待办已完成 {{ overview.todo_completed }}/{{ overview.todo_count }}
    </span>
    <span class="overview__track" aria-hidden="true">
      <span class="overview__fill" :style="{ width: `${percent}%` }"></span>
    </span>
  </div>
</template>

<style scoped>
.overview {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-9);
  height: 40px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-8);
  background: var(--color-overview-bg);
  white-space: nowrap;
}

.overview__icon {
  color: var(--color-brand);
}

.overview__title {
  flex-shrink: 0;
  font-size: var(--font-size-12);
  color: var(--color-text-strong);
}

.overview__count {
  flex-shrink: 0;
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.overview__separator {
  font-size: var(--font-size-13);
  color: var(--color-text-muted);
}

.overview__spacer {
  flex: 1;
}

.overview__progress-text {
  flex-shrink: 0;
  font-size: var(--font-size-11);
  color: var(--color-brand);
}

.overview__track {
  flex-shrink: 0;
  width: 72px;
  height: 4px;
  overflow: hidden;
  border-radius: var(--radius-3);
  background: var(--color-progress-summary-track);
}

.overview__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-3);
  background: var(--color-progress-summary-fill);
}
</style>
