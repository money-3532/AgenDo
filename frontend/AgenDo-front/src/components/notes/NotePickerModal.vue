<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { tagStyle } from '@/utils/tags'

const props = defineProps({
  visible: { type: Boolean, default: false },
  notes: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'confirm'])

const keyword = ref('')
const selected = ref(null)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    keyword.value = ''
    selected.value = null
  },
)

const filtered = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return props.notes
  return props.notes.filter((note) => note.title.toLowerCase().includes(text))
})

const pick = (note) => {
  selected.value = note
}
</script>

<template>
  <AppModal v-if="visible" title="选择备忘笔记" width="360px" @close="$emit('close')">
    <div class="picker">
      <label class="search">
        <AppIcon name="search" :size="14" />
        <input v-model="keyword" type="text" placeholder="搜索笔记标题…" />
      </label>

      <div class="picker__meta">
        <span class="picker__scope">
          <AppIcon name="notebook-pen" :size="12" />
          备忘笔记 · 全部
        </span>
        <span class="picker__total">共 {{ notes.length }} 篇</span>
      </div>

      <ul class="picker__list">
        <li v-for="note in filtered" :key="note.id">
          <button
            class="pick-row"
            :class="{ 'pick-row--selected': selected?.id === note.id }"
            type="button"
            @click="pick(note)"
          >
            <span class="pick-row__icon">
              <AppIcon name="file-text" :size="12" />
            </span>
            <span class="pick-row__text">
              <span class="pick-row__title">{{ note.title }}</span>
              <span v-if="note.tags && note.tags.length" class="pick-row__tags">
                <span
                  v-for="tag in note.tags"
                  :key="tag.id"
                  class="pick-row__tag"
                  :style="tagStyle(tag)"
                >
                  {{ tag.name }}
                </span>
              </span>
            </span>
            <AppIcon v-if="selected?.id === note.id" name="check" :size="12" class="pick-row__check" />
          </button>
        </li>
        <li v-if="!filtered.length" class="picker__empty">没有匹配的笔记</li>
      </ul>
    </div>

    <template #footer>
      <button class="button button--ghost" type="button" @click="$emit('close')">取消</button>
      <button
        class="button button--primary"
        type="button"
        :disabled="!selected"
        @click="emit('confirm', selected)"
      >
        关联「{{ selected?.title || '笔记' }}」
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.search {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 36px;
  padding: 0 var(--space-10);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-secondary);
}

.search input {
  flex: 1;
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.search input::placeholder {
  color: var(--color-text-muted);
}

.picker__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.picker__scope {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.picker__total {
  color: var(--color-text-muted);
}

.picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 260px;
  min-height: 80px;
  overflow-y: auto;
}

.pick-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  padding: var(--space-8);
  border: 1px solid transparent;
  border-radius: var(--radius-8);
  text-align: left;
  transition: all 0.1s ease;
}

.pick-row:hover {
  background: var(--color-bg-page);
}

.pick-row--selected {
  border-color: var(--color-border-selected);
  background: var(--color-nav-active-bg);
}

.pick-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.pick-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.pick-row__title {
  overflow: hidden;
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.pick-row__tag {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  line-height: 1;
}

.pick-row__check {
  flex-shrink: 0;
  color: var(--color-brand);
}

.picker__empty {
  padding: var(--space-16) 0;
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
  text-align: center;
}

.button {
  height: 32px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-7);
  font-size: var(--font-size-12);
}

.button--ghost {
  background: var(--color-view-switch-bg);
  color: var(--color-text-secondary);
}

.button--ghost:hover {
  color: var(--color-text-primary);
}

.button--primary {
  background: var(--color-brand);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.button--primary:hover:not(:disabled) {
  background: #4c6d90;
}

.button--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
