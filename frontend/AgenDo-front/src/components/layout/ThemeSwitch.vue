<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const theme = ref('light')
</script>

<template>
  <div class="theme-switch">
    <button
      class="theme-switch__option"
      :class="{ 'theme-switch__option--active': theme === 'light' }"
      type="button"
      @click="theme = 'light'"
    >
      <AppIcon name="sun" :size="14" />
      <span>浅色</span>
    </button>
    <button
      class="theme-switch__option"
      :class="{ 'theme-switch__option--active': theme === 'dark' }"
      type="button"
      @click="theme = 'dark'"
    >
      <AppIcon name="moon" :size="14" />
      <span>深色</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-8);
  background: var(--color-theme-switch-bg);
}

.theme-switch__option {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  height: 28px;
  border-radius: var(--radius-6);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.theme-switch__option--active {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.theme-switch__option--active svg {
  color: var(--color-brand);
}
</style>
