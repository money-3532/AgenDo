<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import { tagStyle } from '@/utils/tags'

defineProps({
  tags: { type: Array, default: () => [] },
  counts: { type: Object, default: () => ({}) },
})
defineEmits(['select', 'create'])
</script>

<template>
  <section class="tag-stats">
    <header class="tag-stats__head">
      <h2 class="tag-stats__title">我的标签</h2>
      <button class="tag-stats__add" type="button" aria-label="新建标签" @click="$emit('create')">
        <AppIcon name="plus" :size="13" />
      </button>
    </header>
    <div class="tag-stats__list">
      <button
        v-for="tag in tags"
        :key="tag.id"
        class="tag-chip"
        type="button"
        :style="tagStyle(tag)"
        @click="$emit('select', tag.id)"
      >
        {{ tag.name }}&nbsp;&nbsp;{{ counts[tag.id] || 0 }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.tag-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

.tag-stats__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-stats__title {
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
}

.tag-stats__add {
  display: flex;
  color: var(--color-text-secondary);
}

.tag-stats__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.tag-chip {
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-5);
  font-size: var(--font-size-11);
  line-height: var(--line-height-base);
  white-space: nowrap;
}
</style>
