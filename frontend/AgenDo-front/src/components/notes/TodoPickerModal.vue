<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { TODAY_KEY, formatDayGroupLabel, formatTime } from '@/utils/date'

const props = defineProps({
  visible: { type: Boolean, default: false },
  todos: { type: Array, default: () => [] },
  details: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'confirm'])

const expanded = ref(new Set([TODAY_KEY]))
const selected = ref(new Set())

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    expanded.value = new Set([TODAY_KEY])
    selected.value = new Set()
  },
)

const groups = computed(() => {
  const map = new Map()
  for (const entry of props.todos) {
    const key = (props.details[entry.id]?.due_at || '').slice(0, 10) || TODAY_KEY
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entries]) => ({
      key,
      label: formatDayGroupLabel(key),
      entries: entries.sort((a, b) =>
        (props.details[a.id]?.due_at || '').localeCompare(props.details[b.id]?.due_at || ''),
      ),
    }))
})

const toggleGroup = (key) => {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

const toggle = (entry) => {
  if (entry.completion_status === 'completed') return
  const next = new Set(selected.value)
  if (next.has(entry.id)) next.delete(entry.id)
  else next.add(entry.id)
  selected.value = next
}

const timeOf = (entry) => formatTime(props.details[entry.id]?.due_at)
</script>

<template>
  <AppModal v-if="visible" title="选择目标待办" width="320px" @close="$emit('close')">
    <div class="picker">
      <div class="picker__meta">
        <span class="picker__scope">
          <AppIcon name="folder" :size="12" />
          待办中心 · 全部待办
        </span>
        <span class="picker__total">共 {{ todos.length }} 条</span>
      </div>

      <div class="picker__list">
        <section v-for="group in groups" :key="group.key" class="group">
          <button class="group__head" type="button" @click="toggleGroup(group.key)">
            <AppIcon :name="expanded.has(group.key) ? 'chevron-down' : 'chevron-right'" :size="12" />
            <span class="group__label">{{ group.label }}</span>
            <span class="group__count">{{ group.entries.length }} 条</span>
          </button>

          <ul v-if="expanded.has(group.key)" class="group__items">
            <li v-for="entry in group.entries" :key="entry.id">
              <button
                class="pick-row"
                :class="{
                  'pick-row--selected': selected.has(entry.id),
                  'pick-row--done': entry.completion_status === 'completed',
                }"
                type="button"
                @click="toggle(entry)"
              >
                <span class="pick-row__box">
                  <AppIcon
                    v-if="entry.completion_status === 'completed' || selected.has(entry.id)"
                    name="check"
                    :size="10"
                    :stroke-width="2.6"
                  />
                </span>
                <span class="pick-row__title">{{ entry.title }}</span>
                <span class="pick-row__time">{{ timeOf(entry) }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <template #footer>
      <span class="picker__selected">已选 {{ selected.size }} 条待办</span>
      <button class="button button--ghost" type="button" @click="$emit('close')">取消</button>
      <button class="button button--primary" type="button" @click="emit('confirm', [...selected])">确认</button>
    </template>
  </AppModal>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  height: 316px;
  min-height: 0;
}

.picker__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-8);
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
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
}

.group {
  display: flex;
  flex-direction: column;
}

.group__head {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 30px;
  padding: 0 var(--space-2);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.group__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group__count {
  margin-left: auto;
  color: var(--color-text-muted);
}

.group__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pick-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  height: 32px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-6);
  text-align: left;
}

.pick-row:hover {
  background: var(--color-bg-page);
}

.pick-row--selected {
  background: var(--color-nav-active-bg);
}

.pick-row__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-4);
  color: var(--color-text-inverse);
}

.pick-row--selected .pick-row__box,
.pick-row--done .pick-row__box {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.pick-row__title {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-row--done .pick-row__title {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.pick-row__time {
  flex-shrink: 0;
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.pick-row--selected .pick-row__time {
  color: var(--color-brand);
}

.picker__selected {
  margin-right: auto;
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.button {
  height: 32px;
  padding: 0 var(--space-16);
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

.button--primary:hover {
  background: #4c6d90;
}
</style>
