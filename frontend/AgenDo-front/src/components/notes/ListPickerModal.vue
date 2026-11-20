<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({
  picker: { type: Object, default: () => ({ visible: false, tasks: [] }) },
  lists: { type: Array, default: () => [] },
  counts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'confirm'])

const keyword = ref('')
const selectedId = ref('list-work')

watch(
  () => props.picker.visible,
  (visible) => {
    if (!visible) return
    keyword.value = ''
    selectedId.value = props.picker.defaultListId || props.lists[0]?.id || 'list-work'
  },
  { immediate: true },
)

const filtered = computed(() => {
  const text = keyword.value.trim()
  if (!text) return props.lists
  return props.lists.filter((list) => list.name.includes(text))
})

const taskCount = computed(() => props.picker.tasks?.length || 0)
</script>

<template>
  <AppModal
    title="选择待办清单"
    :subtitle="picker.noteTitle ? `把「${picker.noteTitle}」中的 ${taskCount} 个任务导入到清单` : `导入 ${taskCount} 个任务`"
    width="420px"
    @close="$emit('close')"
  >
    <label class="search">
      <AppIcon name="search" :size="14" />
      <input v-model="keyword" type="text" placeholder="搜索清单…" />
    </label>

    <ul class="folders">
      <li v-for="list in filtered" :key="list.id">
        <button
          class="folder"
          :class="{ 'folder--active': selectedId === list.id }"
          type="button"
          @click="selectedId = list.id"
        >
          <span class="folder__icon" :style="{ color: list.color, background: `${list.color}14` }">
            <AppIcon :name="selectedId === list.id ? 'folder-open' : 'folder'" :size="16" />
          </span>
          <span class="folder__text">
            <span class="folder__name">{{ list.name }}</span>
            <span class="folder__meta">待办 {{ counts[list.id] ?? 0 }} 项</span>
          </span>
          <span class="folder__check" :class="{ 'folder__check--on': selectedId === list.id }">
            <AppIcon v-if="selectedId === list.id" name="check" :size="11" :stroke-width="2.4" />
          </span>
        </button>
      </li>
      <li v-if="!filtered.length" class="folders__empty">没有匹配的清单</li>
    </ul>

    <div class="summary">
      <AppIcon name="import" :size="14" />
      <span>导入后会生成待办条目，并保留与笔记的关联</span>
    </div>

    <template #footer>
      <button class="button button--ghost" type="button" @click="$emit('close')">取消</button>
      <button class="button button--primary" type="button" @click="$emit('confirm', selectedId)">
        导入到「{{ lists.find((item) => item.id === selectedId)?.name || '清单' }}」
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
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

.folders {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 240px;
  overflow-y: auto;
}

.folder {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  width: 100%;
  padding: var(--space-8);
  border: 1px solid transparent;
  border-radius: var(--radius-8);
  text-align: left;
}

.folder:hover {
  background: var(--color-bg-page);
}

.folder--active {
  border-color: var(--color-border-selected);
  background: var(--color-bg-active);
}

.folder__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-8);
}

.folder__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}

.folder__name {
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.folder__meta {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.folder__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-full);
  color: var(--color-text-inverse);
}

.folder__check--on {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.folders__empty {
  padding: var(--space-20) 0;
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
  text-align: center;
}

.summary {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  padding: var(--space-9) var(--space-10);
  border-radius: var(--radius-8);
  background: var(--color-bg-page);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.button {
  height: 36px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-8);
  font-size: var(--font-size-12);
}

.button--ghost {
  border: 1px solid var(--color-border);
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

.button--primary:hover {
  background: #4c6d90;
}
</style>
