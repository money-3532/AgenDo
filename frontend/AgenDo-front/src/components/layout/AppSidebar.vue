<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import SidebarBrand from './SidebarBrand.vue'
import SidebarNav from './SidebarNav.vue'
import SidebarContextList from './SidebarContextList.vue'
import TodayBriefing from './TodayBriefing.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import UserAccount from './UserAccount.vue'

defineProps({
  collapsed: { type: Boolean, default: false },
  user: { type: Object, default: null },
  briefing: { type: Object, default: null },
  counts: { type: Object, default: () => ({ calendar: 0, todos: 0, notes: 0 }) },
  activeKey: { type: String, default: 'calendar' },
  context: { type: Object, default: null },
  newLabel: { type: String, default: '新建条目' },
})
defineEmits([
  'toggle',
  'new-entry',
  'select',
  'open-ai',
  'select-note',
  'select-list',
  'create-context',
  'import-note',
  'import-note-todos',
])
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <SidebarBrand :collapsed="collapsed" @toggle="$emit('toggle')" />

    <button v-if="!collapsed" class="new-entry" type="button" @click="$emit('new-entry')">
      <span class="new-entry__main">
        <AppIcon name="plus" :size="17" />
        <span>{{ newLabel }}</span>
      </span>
      <AppIcon name="chevron-down" :size="15" />
    </button>

    <template v-if="collapsed">
      <button class="new-entry new-entry--icon" type="button" :aria-label="newLabel" @click="$emit('new-entry')">
        <AppIcon name="plus" :size="18" />
      </button>
      <button class="collapsed-action" type="button" aria-label="AI 快速指令" @click="$emit('open-ai')">
        <AppIcon name="wand" :size="17" />
      </button>
      <SidebarNav collapsed :counts="counts" :active-key="activeKey" @select="$emit('select', $event)" />
      <span class="sidebar__divider" aria-hidden="true"></span>
      <span class="sidebar__spacer" aria-hidden="true"></span>
      <button class="collapsed-action" type="button" aria-label="展开侧栏" @click="$emit('toggle')">
        <AppIcon name="panel-left-open" :size="18" />
      </button>
      <button class="collapsed-action" type="button" aria-label="切换主题">
        <AppIcon name="sun" :size="18" />
      </button>
      <UserAccount :user="user" class="sidebar__account" />
    </template>

    <template v-else>
      <SidebarNav :counts="counts" :active-key="activeKey" @select="$emit('select', $event)" />
      <SidebarContextList
        v-if="context"
        :context="context"
        @select-note="$emit('select-note', $event)"
        @select-list="$emit('select-list', $event)"
        @create="$emit('create-context', $event)"
        @import-note="$emit('import-note', $event)"
        @import-note-todos="$emit('import-note-todos', $event)"
      />
      <TodayBriefing v-if="!context" :briefing="briefing" />
      <span class="sidebar__spacer" aria-hidden="true"></span>
      <ThemeSwitch />
      <UserAccount :user="user" />
    </template>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--space-18);
  width: var(--sidebar-width);
  height: 100vh;
  padding: var(--space-26) var(--space-20) var(--space-20);
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-sidebar);
  transition: width 0.12s ease-in;
}

.sidebar--collapsed {
  align-items: center;
  gap: var(--space-22);
  width: var(--sidebar-collapsed-width);
  padding: var(--space-24) var(--space-12);
}

.new-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-8);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-medium);
}

.new-entry:hover {
  background: #4c6d90;
}

.new-entry__main {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.new-entry--icon {
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
}

.sidebar__spacer {
  flex: 1;
  min-height: var(--space-12);
}

.sidebar__divider {
  width: 32px;
  height: 1px;
  background: var(--color-border);
}

.sidebar__account {
  justify-content: center;
}

.sidebar--collapsed .sidebar__account :deep(.account__info),
.sidebar--collapsed .sidebar__account :deep(.account__switch) {
  display: none;
}

.collapsed-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.collapsed-action:hover {
  background: var(--color-bg-card);
}
</style>
