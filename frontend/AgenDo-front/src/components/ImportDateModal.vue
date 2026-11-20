<script setup>
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { TODAY_KEY, formatDateCN } from '@/utils/date'

const props = defineProps({
  visible: { type: Boolean, default: false },
  entry: { type: Object, default: null },
})
const emit = defineEmits(['close', 'import', 'remove'])

const date = ref(TODAY_KEY)

watch(
  () => props.visible,
  (visible) => {
    if (visible) date.value = TODAY_KEY
  },
)

const existingDates = () => (props.entry?.imported_dates || []).slice().sort()

const confirm = () => {
  if (!date.value) return
  emit('import', date.value)
}
</script>

<template>
  <AppModal v-if="visible" title="导入到日程" width="320px" @close="$emit('close')">
    <div class="importer">
      <p class="importer__title">「{{ entry?.title || '条目' }}」</p>

      <div class="importer__row">
        <span class="importer__label">导入到</span>
        <input v-model="date" class="importer__date" type="date" />
        <button class="button button--primary" type="button" :disabled="!date" @click="confirm">导入</button>
      </div>

      <div v-if="existingDates().length" class="importer__existing">
        <span class="importer__existing-label">已导入到</span>
        <span v-for="d in existingDates()" :key="d" class="importer__chip">
          {{ formatDateCN(d) }}
          <button class="importer__chip-x" type="button" :aria-label="`移除 ${formatDateCN(d)}`" @click="$emit('remove', d)">
            <AppIcon name="x" :size="10" />
          </button>
        </span>
      </div>
    </div>

    <template #footer>
      <button class="button button--ghost" type="button" @click="$emit('close')">关闭</button>
    </template>
  </AppModal>
</template>

<style scoped>
.importer {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.importer__title {
  margin: 0;
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.importer__row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.importer__label {
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
}

.importer__date {
  flex: 1;
  height: 32px;
  padding: 0 var(--space-10);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
  color-scheme: light;
}

.importer__date:focus {
  outline: none;
  border-color: var(--color-border-selected);
}

.importer__existing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-6);
  padding-top: var(--space-8);
  border-top: 1px solid var(--color-border);
}

.importer__existing-label {
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}

.importer__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  padding: 2px 6px 2px 8px;
  border-radius: 999px;
  background: var(--color-nav-active-bg);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.importer__chip-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  color: var(--color-text-muted);
}

.importer__chip-x:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
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
