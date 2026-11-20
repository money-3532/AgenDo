<script setup>
import { ref } from 'vue'

defineProps({
  text: { type: String, default: '' },
})

const root = ref(null)
const visible = ref(false)
const position = ref({ left: 0, top: 0 })

/** 只有真正被截断时才显示完整标题 */
const show = () => {
  const node = root.value
  if (!node) return
  if (node.scrollWidth <= node.clientWidth + 1) return
  const rect = node.getBoundingClientRect()
  position.value = {
    left: Math.min(rect.left, window.innerWidth - 300),
    top: rect.bottom + 6,
  }
  visible.value = true
}
</script>

<template>
  <span ref="root" class="tooltip-text" @mouseenter="show" @mouseleave="visible = false">
    {{ text }}
    <Teleport to="body">
      <div
        v-if="visible"
        class="tooltip-text__pop"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
      >
        {{ text }}
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.tooltip-text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltip-text__pop {
  position: fixed;
  z-index: 80;
  max-width: 288px;
  padding: var(--space-7) var(--space-10);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
  font-size: var(--font-size-11);
  line-height: 1.55;
  color: var(--color-text-primary);
  pointer-events: none;
  word-break: break-all;
}
</style>
