<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import { tagStyle } from '@/utils/tags'

defineProps({
  tag: { type: Object, default: null },
  typeLabel: { type: String, default: '全部类型' },
  includeCompleted: { type: Boolean, default: true },
})
defineEmits(['clear-tag', 'clear-type', 'clear-filters', 'toggle-completed'])
</script>

<template>
  <div class="filter-bar">
    <AppIcon name="sliders" :size="14" class="filter-bar__icon" />
    <span class="filter-bar__label">筛选</span>
    <button v-if="tag" class="filter-chip filter-chip--tag" type="button" :style="tagStyle(tag)" @click="$emit('clear-tag')">
      {{ tag.name }}
      <AppIcon name="x" :size="10" />
    </button>
    <button class="filter-chip filter-chip--type" type="button" @click="$emit('clear-type')">
      {{ typeLabel }}
      <AppIcon name="x" :size="10" />
    </button>
    <button class="filter-bar__clear" type="button" @click="$emit('clear-filters')">清除</button>
    <span class="filter-bar__spacer" aria-hidden="true"></span>
    <button class="filter-bar__completed" type="button" @click="$emit('toggle-completed')">
      <span class="filter-bar__checkbox" :class="{ 'filter-bar__checkbox--checked': includeCompleted }">
        <AppIcon v-if="includeCompleted" name="check" :size="11" />
      </span>
      <span>显示已完成</span>
    </button>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-shrink: 0;
  height: 28px;
  white-space: nowrap;
}

.filter-bar__icon {
  color: var(--color-text-link);
  flex-shrink: 0;
}

.filter-bar__label {
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.filter-chip {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-4);
  height: 24px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-5);
  font-size: var(--font-size-11);
  white-space: nowrap;
}

.filter-chip--type {
  background: var(--color-chip-neutral-bg);
  color: var(--color-text-secondary);
}

.filter-bar__clear {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.filter-bar__clear:hover {
  color: var(--color-text-primary);
}

.filter-bar__spacer {
  flex: 1;
}

.filter-bar__completed {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-6);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.filter-bar__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-4);
  background: var(--color-bg-card);
  color: var(--color-text-inverse);
}

.filter-bar__checkbox--checked {
  border-color: var(--color-brand);
  background: var(--color-brand);
}
</style>
