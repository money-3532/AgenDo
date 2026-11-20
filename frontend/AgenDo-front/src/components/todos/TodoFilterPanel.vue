<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({
  priority: { type: Array, default: () => [] },
  status: { type: Array, default: () => [] },
  time: { type: String, default: 'all' },
  customDate: { type: String, default: '' },
  customDateLabel: { type: String, default: '' },
})

const emit = defineEmits([
  'update:priority',
  'update:status',
  'update:time',
  'update:customDate',
  'clear',
])

const PRIORITY_OPTIONS = [
  { value: 'important', label: '重要' },
  { value: 'urgent', label: '紧急' },
  { value: 'normal', label: '常规' },
  { value: 'later', label: '可延后' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已逾期' },
]

const TIME_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'no_due', label: '无截止日期' },
  { value: 'all', label: '全部' },
]

const hasActive = computed(
  () => props.priority.length > 0 || props.status.length > 0 || props.time !== 'all',
)

const toggleMulti = (field, selected, value) => {
  const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
  emit(`update:${field}`, next)
}

const dateLabel = computed(() =>
  props.time === 'custom' && props.customDate ? props.customDateLabel || props.customDate : '自定义日期',
)

const dateInput = ref(null)

const openDatePicker = () => {
  if (dateInput.value?.showPicker) dateInput.value.showPicker()
  else dateInput.value?.click()
}

const handleDateChange = (event) => {
  const value = event.target.value
  if (value) {
    emit('update:customDate', value)
    emit('update:time', 'custom')
  } else {
    emit('update:customDate', '')
    emit('update:time', 'all')
  }
}
</script>

<template>
  <section class="todo-filter" aria-label="待办筛选">
    <header class="todo-filter__head">
      <div class="todo-filter__title">
        <AppIcon name="sliders" :size="13" />
        <span>筛选</span>
      </div>
      <button
        class="todo-filter__clear"
        type="button"
        :disabled="!hasActive"
        :aria-disabled="!hasActive"
        @click="hasActive && $emit('clear')"
      >
        <AppIcon name="x" :size="11" />
        清空筛选
      </button>
    </header>

    <div class="todo-filter__groups">
      <div class="filter-group">
        <span class="filter-group__title">优先级</span>
        <div class="filter-group__chips" role="group" aria-label="优先级筛选，可多选">
          <button
            class="chip"
            :class="{ 'chip--active': !priority.length }"
            type="button"
            :aria-pressed="!priority.length"
            @click="emit('update:priority', [])"
          >
            全部
          </button>
          <button
            v-for="option in PRIORITY_OPTIONS"
            :key="option.value"
            class="chip"
            :class="{ 'chip--active': priority.includes(option.value) }"
            type="button"
            :aria-pressed="priority.includes(option.value)"
            @click="toggleMulti('priority', priority, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-group__title">状态</span>
        <div class="filter-group__chips" role="group" aria-label="任务状态筛选，可多选">
          <button
            class="chip"
            :class="{ 'chip--active': !status.length }"
            type="button"
            :aria-pressed="!status.length"
            @click="emit('update:status', [])"
          >
            全部
          </button>
          <button
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            class="chip"
            :class="{ 'chip--active': status.includes(option.value) }"
            type="button"
            :aria-pressed="status.includes(option.value)"
            @click="toggleMulti('status', status, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-group__title">时间</span>
        <div class="filter-group__chips" role="radiogroup" aria-label="截止时间筛选">
          <button
            v-for="option in TIME_OPTIONS"
            :key="option.value"
            class="chip"
            :class="{ 'chip--active': time === option.value }"
            type="button"
            role="radio"
            :aria-checked="time === option.value"
            @click="emit('update:time', option.value)"
          >
            {{ option.label }}
          </button>
          <button
            class="chip chip--date"
            :class="{ 'chip--active': time === 'custom' }"
            type="button"
            :aria-label="`自定义日期：${dateLabel}`"
            @click="openDatePicker"
          >
            <AppIcon name="calendar" :size="11" />
            {{ dateLabel }}
          </button>
          <input
            ref="dateInput"
            class="todo-filter__date-input"
            type="date"
            :value="customDate"
            tabindex="-1"
            aria-hidden="true"
            @change="handleDateChange"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.todo-filter {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--space-10);
  padding: var(--space-14) var(--space-16);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.todo-filter__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
}

.todo-filter__title {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.todo-filter__clear {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 24px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-5);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  transition: color 0.1s ease, background 0.1s ease;
}

.todo-filter__clear:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-chip-neutral-bg);
}

.todo-filter__clear:disabled {
  cursor: default;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.todo-filter__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.filter-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-6);
}

.filter-group__title {
  flex-shrink: 0;
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.filter-group__chips {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-6);
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 24px;
  flex-shrink: 0;
  padding: 0 var(--space-10);
  border-radius: var(--radius-5);
  background: var(--color-chip-neutral-bg);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: background 0.1s ease, color 0.1s ease;
}

.chip:hover {
  color: var(--color-text-primary);
}

.chip--active {
  background: var(--color-brand);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.chip--date {
  border: 1px dashed var(--color-border-input);
  background: transparent;
  color: var(--color-text-secondary);
}

.chip--date.chip--active {
  border-style: solid;
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.todo-filter__date-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
