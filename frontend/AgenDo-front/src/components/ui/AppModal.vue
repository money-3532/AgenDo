<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  width: { type: String, default: '440px' },
  bareFooter: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const onKeydown = (event) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="modal-root">
    <div class="modal-root__mask" @click="$emit('close')"></div>

    <section class="modal" :style="{ width }" role="dialog" aria-modal="true" :aria-label="title">
      <header class="modal__head">
        <div class="modal__heading">
          <h2 class="modal__title">{{ title }}</h2>
          <p v-if="subtitle" class="modal__subtitle">{{ subtitle }}</p>
        </div>
        <button class="modal__close" type="button" aria-label="关闭" @click="$emit('close')">
          <AppIcon name="x" :size="16" />
        </button>
      </header>

      <div class="modal__body">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="modal__foot" :class="{ 'modal__foot--bare': bareFooter }">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-root__mask {
  position: absolute;
  inset: 0;
  background: var(--color-mask);
}

.modal {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  border-radius: var(--radius-14);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  gap: var(--space-16);
  padding: var(--space-20) var(--space-20) var(--space-14);
}

.modal__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal__title {
  font-size: var(--font-size-15);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.modal__subtitle {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
  color: var(--color-text-secondary);
}

.modal__close:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.modal__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-16);
  min-height: 0;
  padding: 0 var(--space-20) var(--space-20);
  overflow-y: auto;
}

.modal__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: var(--space-10);
  padding: var(--space-14) var(--space-20);
  border-top: 1px solid var(--color-border);
}

.modal__foot--bare {
  padding-top: 0;
  border-top: none;
}
</style>
