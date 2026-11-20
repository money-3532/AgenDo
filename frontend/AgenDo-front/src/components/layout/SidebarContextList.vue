<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TooltipText from '@/components/ui/TooltipText.vue'
import { TODAY_KEY, formatRelativeTime, formatTime } from '@/utils/date'

const props = defineProps({
  context: { type: Object, default: null },
})

defineEmits(['select-note', 'select-list', 'create', 'import-note', 'import-note-todos'])

const isNotes = computed(() => props.context?.kind === 'notes')
const title = computed(() => (isNotes.value ? '笔记目录' : '待办清单'))

const noteStamp = (note) => {
  const value = note.updated_at || note.created_at || ''
  if (!value) return ''
  if (value.slice(0, 10) === TODAY_KEY) return formatTime(value)
  return formatRelativeTime(value)
}
</script>

<template>
  <section v-if="context" class="context">
    <header class="context__head">
      <span class="context__title">{{ title }}</span>
      <button
        v-if="!isNotes"
        class="context__add"
        type="button"
        :aria-label="`新建${title}`"
        @click="$emit('create', context.kind)"
      >
        <AppIcon name="plus" :size="13" />
      </button>
    </header>

    <ul v-if="isNotes" class="context__list">
      <li v-for="note in context.items" :key="note.id" class="note-item">
        <button
          class="note-row"
          :class="{ 'note-row--active': context.activeId === note.id }"
          type="button"
          @click="$emit('select-note', note.id)"
        >
          <TooltipText class="note-row__name" :text="note.title" />
          <span class="note-row__time">{{ noteStamp(note) }}</span>
        </button>
        <button
          class="note-row__import"
          :class="{ 'note-row__import--active': note.imported_dates && note.imported_dates.length }"
          type="button"
          :aria-label="`导入「${note.title}」到日程`"
          :title="note.imported_dates && note.imported_dates.length ? `已导入到日程（${note.imported_dates.length}）` : '导入到日程'"
          @click.stop="$emit('import-note', note)"
        >
          <AppIcon name="import" :size="12" />
        </button>
        <button
          class="note-row__import"
          :class="{ 'note-row__import--active': note.imported_to_todos }"
          type="button"
          :aria-label="`导入「${note.title}」到待办中心`"
          :title="note.imported_to_todos ? '已导入到待办中心（点击移除）' : '导入到待办中心'"
          @click.stop="$emit('import-note-todos', note)"
        >
          <AppIcon name="square-check" :size="12" />
        </button>
      </li>
    </ul>

    <ul v-else class="context__list">
      <li v-for="list in context.items" :key="list.id">
        <button
          class="context-row"
          :class="{ 'context-row--active': context.activeId === list.id }"
          type="button"
          @click="$emit('select-list', list.id)"
        >
          <span class="context-row__icon" :style="{ color: list.color }">
            <AppIcon name="folder" :size="13" />
          </span>
          <span class="context-row__text">
            <TooltipText class="context-row__name" :text="list.name" />
          </span>
          <span class="context-row__count">{{ context.counts?.[list.id] ?? 0 }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.context {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-top: var(--space-14);
  border-top: 1px solid var(--color-border);
}

.context__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.context__title {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.context__add {
  display: flex;
  color: var(--color-text-secondary);
}

.context__add:hover {
  color: var(--color-brand);
}

.context__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.context-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  padding: var(--space-6) var(--space-8);
  border-radius: var(--radius-7);
  text-align: left;
}

.context-row:hover {
  background: var(--color-bg-card);
}

.context-row--active {
  background: var(--color-nav-active-bg);
}

.context-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  color: var(--color-text-secondary);
}

.context-row__icon--note {
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.context-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.context-row__name {
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.context-row__meta {
  overflow: hidden;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-row__count {
  flex-shrink: 0;
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.note-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  padding: var(--space-5) var(--space-8);
  border-radius: var(--radius-6);
  text-align: left;
}

.note-row:hover {
  background: var(--color-bg-card);
}

.note-row--active {
  background: var(--color-nav-active-bg);
}

.note-row__name {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row__time {
  flex-shrink: 0;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.note-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.note-item .note-row {
  flex: 1;
  min-width: 0;
}

.note-row__import {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity 0.1s ease, color 0.1s ease, background 0.1s ease;
}

.note-item:hover .note-row__import {
  opacity: 1;
}

.note-row__import:hover {
  color: var(--color-brand);
  background: var(--color-bg-card);
}

.note-row__import--active {
  opacity: 1;
  color: var(--color-brand);
}
</style>
