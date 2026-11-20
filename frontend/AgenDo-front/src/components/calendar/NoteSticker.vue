<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  entry: { type: Object, required: true },
})
defineEmits(['select', 'hover', 'leave'])
</script>

<template>
  <button
    class="note-chip"
    type="button"
    :title="entry.title"
    @click.stop="$emit('select', entry.id)"
    @mouseenter="$emit('hover', entry, $event)"
    @mouseleave="$emit('leave')"
  >
    <AppIcon name="file-text" :size="11" />
    <span class="note-chip__title">{{ entry.title }}</span>
  </button>
</template>

<style scoped>
.note-chip {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
  height: var(--cell-chip-height);
  padding: 0 var(--space-7);
  overflow: hidden;
  border-radius: var(--radius-4);
  background: var(--color-tag-amber-bg);
  font-size: var(--font-size-11);
  line-height: 1;
  color: var(--color-tag-amber-text);
  text-align: left;
}

.note-chip:hover {
  filter: brightness(0.97);
}

.note-chip svg {
  flex-shrink: 0;
}

.note-chip__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
