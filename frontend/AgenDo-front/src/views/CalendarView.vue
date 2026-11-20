<script setup>
import { onMounted } from 'vue'
import { useCalendarStore } from '@/stores/calendar'
import { useWorkspaceStore } from '@/stores/workspace'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CalendarToolbar from '@/components/calendar/CalendarToolbar.vue'
import OverviewBar from '@/components/calendar/OverviewBar.vue'
import MonthGrid from '@/components/calendar/MonthGrid.vue'
import TimeGridView from '@/components/calendar/TimeGridView.vue'

const store = useCalendarStore()
const ws = useWorkspaceStore()

onMounted(() => {
  store.load()
})

/** 勾选日历中的待办后同步工作区与日历副本，避免两处状态不一致 */
const handleToggleTodo = async (id) => {
  await ws.toggleTodo(id)
  const entry = store.entries.find((item) => item.id === id)
  const todo = ws.todos.find((item) => item.id === id)
  if (entry && todo) entry.completion_status = todo.completion_status
}

const handleTimedAdd = ({ dateKey, hour }) => {
  store.openDraft({ dateKey, hour })
}
</script>

<template>
  <AppLayout>
    <CalendarToolbar
      :label="store.viewLabel"
      :view="store.view"
      @prev="store.shift(-1)"
      @next="store.shift(1)"
      @today="store.goToday"
      @set-view="store.setView"
      @new-entry="store.openDraft()"
    />

    <OverviewBar v-if="store.view !== 'week'" :overview="store.overview" />

    <MonthGrid
      v-if="store.view === 'month'"
      :cells="store.cells"
      :entries-by-date="store.entriesByDate"
      :details="store.details"
      :loading="store.loading"
      @select="store.openEntry"
      @add="(dateKey) => store.openDraft({ dateKey })"
      @hover="store.showHoverPreview"
      @leave="store.scheduleHideHoverPreview"
      @toggle-todo="handleToggleTodo"
    />

    <footer v-if="store.view === 'month'" class="calendar-legend">
      <span class="calendar-legend__item"><i class="calendar-legend__dot calendar-legend__dot--event"></i>日程</span>
      <span class="calendar-legend__item"><i class="calendar-legend__dot calendar-legend__dot--todo"></i>待办</span>
      <span class="calendar-legend__item"><i class="calendar-legend__dot calendar-legend__dot--note"></i>备忘</span>
      <span class="calendar-legend__spacer" aria-hidden="true"></span>
      <span class="calendar-legend__sync">
        <AppIcon name="refresh-cw" :size="11" />
        所有更改已同步 · 刚刚
      </span>
    </footer>

    <TimeGridView
      v-if="store.view === 'day' || store.view === 'week'"
      :days="store.visibleDays"
      :entries-by-date="store.entriesByDate"
      :details="store.details"
      :variant="store.view"
      @select="store.openEntry"
      @hover="store.showHoverPreview"
      @leave="store.scheduleHideHoverPreview"
      @add="handleTimedAdd"
      @toggle-todo="handleToggleTodo"
    />
  </AppLayout>
</template>

<style scoped>
.calendar-legend {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-16);
  height: 16px;
  padding: 0 var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.calendar-legend__item {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.calendar-legend__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
}

.calendar-legend__dot--event {
  background: var(--color-text-link);
}

.calendar-legend__dot--todo {
  background: var(--color-tag-green-text);
}

.calendar-legend__dot--note {
  background: var(--color-tag-amber-text);
}

.calendar-legend__spacer {
  flex: 1;
}

.calendar-legend__sync {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  color: var(--color-text-muted);
}
</style>
