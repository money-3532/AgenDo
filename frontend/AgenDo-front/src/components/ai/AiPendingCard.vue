<script setup>
import { useAiStore } from '@/stores/ai'

const ai = useAiStore()
</script>

<template>
  <section v-if="ai.pending.length" class="pending-card">
    <header class="pending-card__head">
      <h3 class="pending-card__title">AI 待确认任务</h3>
      <span class="pending-card__count">{{ ai.pending.length }} 项</span>
    </header>

    <ul class="pending-card__list">
      <li v-for="(task, index) in ai.pending" :key="task.id" class="pending-row">
        <span class="pending-row__dot" :class="{ 'pending-row__dot--active': index === 0 }"></span>
        <span class="pending-row__text">{{ task.title }}</span>
        <button class="pending-row__run" type="button" @click="ai.confirmPending(task, true)">执行</button>
        <button class="pending-row__skip" type="button" @click="ai.confirmPending(task, false)">拒绝</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.pending-card {
  position: fixed;
  right: var(--space-24);
  bottom: var(--space-24);
  z-index: 30;
  width: 320px;
  padding: var(--space-16) var(--space-16) var(--space-8);
  border-radius: var(--radius-16);
  background: #fafbfd;
  box-shadow: 0 12px 32px -8px rgba(38, 61, 89, 0.18);
}

.pending-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-6);
}

.pending-card__title {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.pending-card__count {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.pending-card__list {
  display: flex;
  flex-direction: column;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 44px;
  border-top: 1px solid var(--color-border);
}

.pending-row:first-child {
  border-top: none;
}

.pending-row__dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-border-input);
}

.pending-row__dot--active {
  background: var(--color-brand);
}

.pending-row__text {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-row__run,
.pending-row__skip {
  height: 22px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-6);
  font-size: var(--font-size-10);
  font-weight: var(--font-weight-medium);
}

.pending-row__run {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.pending-row__skip {
  background: var(--color-chip-neutral-bg);
  color: var(--color-text-secondary);
}
</style>
