<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import { ref } from 'vue'

defineProps({
  title: { type: String, default: '我的日程' },
  hint: { type: String, default: '' },
  search: { type: String, default: '搜索日程、待办与备忘' },
})

const keyword = ref('')
</script>

<template>
  <header class="topbar">
    <div class="topbar__titles">
      <h1 class="topbar__title">{{ title }}</h1>
      <p v-if="hint" class="topbar__hint">{{ hint }}</p>
    </div>

    <div class="topbar__tools">
      <label class="topbar__search">
        <AppIcon name="search" :size="15" />
        <input v-model="keyword" type="search" :placeholder="search" />
      </label>
      <span class="topbar__divider" aria-hidden="true"></span>
      <button class="topbar__icon" type="button" aria-label="通知">
        <AppIcon name="bell" :size="18" />
      </button>
      <button class="topbar__icon" type="button" aria-label="帮助">
        <AppIcon name="circle-help" :size="18" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: var(--topbar-height);
  padding: 0 var(--space-32);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.topbar__titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  overflow: hidden;
}

.topbar__title {
  font-size: var(--font-size-22);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.topbar__hint {
  overflow: hidden;
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__tools {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-16);
}

.topbar__search {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  width: 282px;
  height: 34px;
  padding: 0 var(--space-10);
  border-radius: var(--radius-8);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
}

.topbar__search input {
  width: 100%;
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
}

.topbar__search input::placeholder {
  color: var(--color-text-secondary);
}

.topbar__divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
}

.topbar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  color: var(--color-text-secondary);
}

.topbar__icon:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
</style>
