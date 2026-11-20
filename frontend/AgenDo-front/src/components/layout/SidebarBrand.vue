<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  collapsed: { type: Boolean, default: false },
})
defineEmits(['toggle'])
</script>

<template>
  <div class="brand" :class="{ 'brand--collapsed': collapsed }">
    <div v-if="!collapsed" class="brand__identity">
      <div class="brand__logo">
        <AppIcon name="calendar-check" :size="22" />
      </div>
      <span class="brand__name">AgenDo</span>
    </div>
    <div v-else class="brand__logo">
      <AppIcon name="calendar-check" :size="22" />
    </div>
    <button v-if="!collapsed" class="brand__toggle" type="button" aria-label="收起侧栏" @click="$emit('toggle')">
      <AppIcon name="panel-left-close" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand--collapsed {
  justify-content: center;
}

.brand__identity {
  display: flex;
  align-items: center;
  gap: var(--space-10);
}

.brand__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-10);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.brand__name {
  font-size: var(--font-size-22);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
}

.brand__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.brand__toggle:hover {
  background: var(--color-bg-card);
}
</style>
