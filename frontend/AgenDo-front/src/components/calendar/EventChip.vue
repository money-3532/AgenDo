<script setup>
import { computed } from 'vue'
import { formatTime } from '@/utils/date'
import { tagStyle } from '@/utils/tags'

const props = defineProps({
  entry: { type: Object, required: true },
  detail: { type: Object, default: null },
  tag: { type: Object, default: null },
})
defineEmits(['select', 'hover', 'leave'])

const time = computed(() => formatTime(props.detail?.start_at))
const chipStyle = computed(() => (props.tag ? tagStyle(props.tag) : null))
</script>

<template>
  <button
    class="event-chip"
    type="button"
    :style="chipStyle"
    :title="entry.title"
    @click.stop="$emit('select', entry.id)"
    @mouseenter="$emit('hover', entry, $event)"
    @mouseleave="$emit('leave')"
  >
    <span class="event-chip__time">{{ time }}</span>
    <span class="event-chip__title">{{ entry.title }}</span>
  </button>
</template>

<style scoped>
.event-chip {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
  height: var(--cell-chip-height);
  padding: 0 var(--space-7);
  overflow: hidden;
  border-radius: var(--radius-4);
  background: var(--color-tag-blue-bg);
  font-size: var(--font-size-11);
  line-height: 1;
  color: var(--color-tag-blue-text);
  text-align: left;
}

.event-chip:hover {
  filter: brightness(0.97);
}

.event-chip__time {
  flex-shrink: 0;
  opacity: 0.85;
}

.event-chip__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
