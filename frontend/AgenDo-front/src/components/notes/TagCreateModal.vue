<script setup>
import { computed, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'

defineEmits(['close', 'create'])

const name = ref('')
const color = ref('#7E9BB5')

const palette = [
  '#7E9BB5',
  '#8FAE96',
  '#B49BC8',
  '#C6A878',
  '#B98A8A',
  '#8FA3B8',
  '#7C93AE',
  '#9DB5A0',
  '#8C9C8C',
  '#8FA9BF',
  '#C2A98E',
  '#A99BB5',
  '#9DB0AC',
  '#B1A08B',
  '#A0AAB8',
  '#9CAF9B',
]

const canSubmit = computed(() => name.value.trim().length > 0)
</script>

<template>
  <AppModal title="新建标签" width="340px" bare-footer @close="$emit('close')">
    <label class="name-field">
      <input
        v-model="name"
        class="name-field__input"
        type="text"
        maxlength="12"
        placeholder="给标签起个名字"
        aria-label="标签名称"
      />
      <span class="name-field__count">{{ name.length }} / 12</span>
    </label>

    <div class="colors">
      <span class="colors__label">颜色</span>
      <div class="colors__grid">
        <button
          v-for="item in palette"
          :key="item"
          class="swatch"
          :class="{ 'swatch--active': color === item }"
          type="button"
          :aria-label="`选择颜色 ${item}`"
          :aria-pressed="color === item"
          @click="color = item"
        >
          <span class="swatch__dot" :style="{ background: item }"></span>
        </button>
      </div>
    </div>

    <template #footer>
      <button class="button button--ghost" type="button" @click="$emit('close')">取消</button>
      <button
        class="button button--primary"
        type="button"
        :disabled="!canSubmit"
        @click="$emit('create', { name, color })"
      >
        确认
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.name-field {
  position: relative;
  display: flex;
  align-items: center;
}

.name-field__input {
  width: 100%;
  height: 38px;
  padding: 0 64px 0 var(--space-12);
  border: 1px solid transparent;
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.name-field__input:focus {
  border-color: var(--color-border-selected);
  background: var(--color-bg-card);
}

.name-field__input::placeholder {
  color: var(--color-text-muted);
}

.name-field__count {
  position: absolute;
  right: var(--space-12);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.colors {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

.colors__label {
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.colors__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--space-8) var(--space-4);
  justify-items: center;
}

.swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1.5px solid transparent;
  border-radius: var(--radius-full);
}

.swatch--active {
  border-color: var(--color-brand);
}

.swatch__dot {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
}

.button {
  height: 34px;
  padding: 0 var(--space-18);
  border-radius: var(--radius-8);
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

.button--primary:disabled {
  background: var(--color-progress-fill);
  cursor: default;
}
</style>
