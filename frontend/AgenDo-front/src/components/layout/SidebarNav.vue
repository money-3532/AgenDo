<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  collapsed: { type: Boolean, default: false },
  counts: { type: Object, default: () => ({ calendar: 0, todos: 0, notes: 0 }) },
  activeKey: { type: String, default: 'calendar' },
})
defineEmits(['select'])

const items = [
  { key: 'calendar', icon: 'calendar-days', label: '我的日程', countKey: 'calendar' },
  { key: 'todos', icon: 'square-check', label: '待办中心', countKey: 'todos' },
  { key: 'notes', icon: 'notebook-pen', label: '备忘笔记', countKey: 'notes' },
]
</script>

<template>
  <div v-if="!collapsed" class="nav">
    <button class="ai-entry" type="button" @click="$emit('select', 'ai')">
      <AppIcon name="sparkles" :size="18" />
      <span class="ai-entry__name">智能任务工作台</span>
      <span class="ai-entry__dot" aria-hidden="true"></span>
      <span class="ai-entry__grip" aria-hidden="true"></span>
    </button>

    <ul class="nav__menu">
      <li v-for="item in items" :key="item.key">
        <button
          class="nav-item"
          :class="{ 'nav-item--active': activeKey === item.key }"
          type="button"
          @click="$emit('select', item.key)"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span class="nav-item__name">{{ item.label }}</span>
          <span class="nav-item__count">{{ counts[item.countKey] }}</span>
        </button>
      </li>
    </ul>
  </div>

  <div v-else class="nav nav--collapsed">
    <button
      class="nav-icon"
      type="button"
      aria-label="智能任务工作台"
      @click="$emit('select', 'ai')"
    >
      <AppIcon name="sparkles" :size="18" />
    </button>
    <button
      v-for="item in items"
      :key="item.key"
      class="nav-icon"
      :class="{ 'nav-icon--active': activeKey === item.key }"
      type="button"
      :aria-label="item.label"
      @click="$emit('select', item.key)"
    >
      <AppIcon :name="item.icon" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-18);
}

.nav--collapsed {
  align-items: center;
  gap: var(--space-12);
}

.ai-entry {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  height: 40px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-8);
  background: var(--color-brand-nav);
  color: var(--color-text-inverse);
  text-align: left;
}

.ai-entry__name {
  flex: 1;
  font-size: var(--font-size-13);
  line-height: var(--line-height-base);
}

.ai-entry__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-ai-dot);
}

.ai-entry__grip {
  width: 4px;
  height: 26px;
  border-radius: var(--radius-2);
  background: rgba(255, 255, 255, 0.72);
}

.nav__menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  width: 100%;
  height: 40px;
  padding: 0 var(--space-12);
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.nav-item__name {
  flex: 1;
  font-size: var(--font-size-13);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  text-align: left;
}

.nav-item__count {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.nav-item:hover {
  background: var(--color-bg-card);
}

.nav-item--active {
  background: var(--color-nav-active-bg);
  color: var(--color-brand);
}

.nav-item--active .nav-item__name {
  color: var(--color-text-strong);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.nav-icon:hover {
  background: var(--color-bg-card);
}

.nav-icon--active {
  background: var(--color-nav-active-bg-collapsed);
  color: var(--color-brand);
}
</style>
