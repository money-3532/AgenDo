<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatTimeRange } from '@/utils/date'

defineProps({
  briefing: { type: Object, default: null },
})
</script>

<template>
  <section v-if="briefing" class="briefing">
    <header class="briefing__head">
      <div class="briefing__title-group">
        <h2 class="briefing__title">今日简报</h2>
        <span class="briefing__date">{{ briefing.date_label }}</span>
      </div>
      <button class="briefing__collapse" type="button" aria-label="折叠简报">
        <AppIcon name="chevron-down" :size="14" />
      </button>
    </header>

    <div v-if="briefing.next_event" class="briefing__event">
      <span class="briefing__marker" aria-hidden="true"></span>
      <div class="briefing__event-text">
        <span class="briefing__time">
          {{ formatTimeRange(briefing.next_event.start_at, briefing.next_event.end_at) }}
        </span>
        <span class="briefing__event-name">{{ briefing.next_event.title }}</span>
      </div>
    </div>

    <span class="briefing__divider" aria-hidden="true"></span>

    <p class="briefing__progress">
      待办 · 已完成 {{ briefing.todo_progress.completed }} / {{ briefing.todo_progress.total }}
    </p>

    <ul class="briefing__todos">
      <li
        v-for="todo in briefing.todos"
        :key="todo.id"
        class="briefing__todo"
        :class="{ 'briefing__todo--done': todo.completed }"
      >
        <span class="briefing__checkbox">
          <AppIcon v-if="todo.completed" name="check" :size="11" />
        </span>
        <span class="briefing__todo-name">{{ todo.title }}</span>
      </li>
    </ul>

    <div v-if="briefing.note" class="briefing__note">
      <AppIcon name="sticky-note" :size="13" />
      <span>{{ briefing.note.title }}</span>
    </div>
  </section>
</template>

<style scoped>
.briefing {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-14);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.briefing__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.briefing__title-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.briefing__title {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.briefing__date {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.briefing__collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7789;
}

.briefing__event {
  display: flex;
  gap: var(--space-8);
}

.briefing__marker {
  width: 3px;
  height: 32px;
  border-radius: var(--radius-2);
  background: var(--color-brand);
}

.briefing__event-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.briefing__time {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.briefing__event-name {
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
}

.briefing__divider {
  height: 1px;
  background: var(--color-border);
}

.briefing__progress {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.briefing__todos {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.briefing__todo {
  display: flex;
  align-items: center;
  gap: var(--space-7);
}

.briefing__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border: 1px solid #c8d3df;
  border-radius: var(--radius-4);
  background: var(--color-bg-card);
  color: var(--color-text-inverse);
}

.briefing__todo--done .briefing__checkbox {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.briefing__todo-name {
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
}

.briefing__todo--done .briefing__todo-name {
  color: var(--color-text-muted);
}

.briefing__note {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-8);
  border-radius: var(--radius-6);
  background: var(--color-tag-amber-bg);
  font-size: var(--font-size-11);
  color: var(--color-tag-amber-text);
}
</style>
