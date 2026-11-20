<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  entry: { type: Object, required: true },
})
defineEmits(['select', 'hover', 'leave', 'toggle'])
</script>

<template>
  <div
    class="todo-chip"
    :class="{ 'todo-chip--done': entry.completion_status === 'completed' }"
    role="button"
    tabindex="0"
    :title="entry.title"
    @click="$emit('select', entry.id)"
    @keydown.enter.prevent="$emit('select', entry.id)"
    @keydown.space.prevent="$emit('select', entry.id)"
    @mouseenter="$emit('hover', entry, $event)"
    @mouseleave="$emit('leave')"
  >
    <button
      class="todo-chip__checkbox"
      type="button"
      :aria-label="entry.completion_status === 'completed' ? `标记「${entry.title}」为未完成` : `标记「${entry.title}」为已完成`"
      @click.stop="$emit('toggle', entry.id)"
    >
      <AppIcon v-if="entry.completion_status === 'completed'" name="check" :size="9" :stroke-width="2.6" />
    </button>
    <span class="todo-chip__title">{{ entry.title }}</span>
  </div>
</template>

<style scoped>
.todo-chip {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  width: 100%;
  height: var(--cell-chip-height);
  padding: 0 var(--space-7);
  overflow: hidden;
  border-radius: var(--radius-4);
  font-size: var(--font-size-11);
  line-height: 1;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
}

.todo-chip:hover {
  background: var(--color-bg-hover);
}

.todo-chip__checkbox {
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

.todo-chip--done {
  color: var(--color-text-muted);
}

.todo-chip--done .todo-chip__checkbox {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.todo-chip__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-chip--done .todo-chip__title {
  text-decoration: line-through;
}
</style>
