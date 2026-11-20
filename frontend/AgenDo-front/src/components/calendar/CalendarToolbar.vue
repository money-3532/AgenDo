<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  label: { type: String, required: true },
  view: { type: String, default: 'month' },
})
defineEmits(['prev', 'next', 'today', 'set-view', 'new-entry'])

const views = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'day', label: '日' },
]
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__left">
      <h2 class="toolbar__month">{{ label }}</h2>
      <div class="toolbar__pager">
        <button type="button" aria-label="上一段" @click="$emit('prev')">
          <AppIcon name="chevron-left" :size="16" />
        </button>
        <button type="button" aria-label="下一段" @click="$emit('next')">
          <AppIcon name="chevron-right" :size="16" />
        </button>
      </div>
      <button v-if="view === 'month'" class="toolbar__today" type="button" @click="$emit('today')">本月</button>
    </div>

    <div class="toolbar__right">
      <div class="view-switch" role="tablist" aria-label="视图切换">
        <button
          v-for="item in views"
          :key="item.key"
          class="view-switch__option"
          :class="{ 'view-switch__option--active': view === item.key }"
          type="button"
          role="tab"
          :aria-selected="view === item.key"
          @click="$emit('set-view', item.key)"
        >
          {{ item.label }}
        </button>
      </div>

      <button class="toolbar__new" type="button" @click="$emit('new-entry')">
        <AppIcon name="plus" :size="16" />
        <span>新建</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: var(--toolbar-height);
}

.toolbar__left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-13);
}

.toolbar__month {
  font-size: var(--font-size-24);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.toolbar__pager {
  display: flex;
  gap: var(--space-2);
}

.toolbar__pager button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.toolbar__pager button:hover {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.toolbar__today {
  height: 32px;
  padding: 0 var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-card);
  font-size: var(--font-size-13);
  color: var(--color-text-secondary);
}

.toolbar__today:hover {
  color: var(--color-text-primary);
}

.toolbar__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-12);
}

.view-switch {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-8);
  background: var(--color-view-switch-bg);
}

.view-switch__option {
  width: 32px;
  height: 28px;
  border-radius: var(--radius-6);
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.view-switch__option--active {
  background: var(--color-bg-card);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-strong);
}

.toolbar__new {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 32px;
  padding: 0 var(--space-12);
  border-radius: var(--radius-8);
  background: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.toolbar__new:hover {
  background: #4c6d90;
}
</style>
