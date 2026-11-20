<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({
  block: { type: Object, required: true },
})
const emit = defineEmits(['update', 'toggle', 'import', 'add-after', 'remove'])

const field = ref(null)

const resize = () => {
  const el = field.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const onInput = (event) => {
  emit('update', event.target.value)
  resize()
}

watch(() => props.block.content, () => nextTick(resize))
onMounted(() => nextTick(resize))

const placeholder = computed(() => {
  switch (props.block.block_type) {
    case 'heading':
      return '小标题'
    case 'todo':
      return '待办事项'
    case 'quote':
      return '引用一段话'
    case 'bullet':
      return '列表项'
    default:
      return '输入正文，或按「添加块」插入其他类型'
  }
})
</script>

<template>
  <div class="block" :class="[`block--${block.block_type}`, { 'block--checked': block.checked }]">
    <div class="block__rail">
      <button class="block__rail-button" type="button" aria-label="在下方插入块" @click="$emit('add-after')">
        <AppIcon name="plus" :size="12" />
      </button>
      <button class="block__rail-button" type="button" aria-label="删除块" @click="$emit('remove')">
        <AppIcon name="trash" :size="12" />
      </button>
    </div>

    <div class="block__body">
      <template v-if="block.block_type === 'divider'">
        <span class="block__divider" aria-hidden="true"></span>
      </template>

      <template v-else-if="block.block_type === 'todo'">
        <button
          class="block__check"
          :class="{ 'block__check--on': block.checked }"
          type="button"
          :aria-label="block.checked ? '标记为未完成' : '标记为已完成'"
          @click="$emit('toggle')"
        >
          <AppIcon v-if="block.checked" name="check" :size="10" :stroke-width="2.6" />
        </button>
        <textarea
          ref="field"
          class="block__input block__input--todo"
          :value="block.content"
          :placeholder="placeholder"
          rows="1"
          @input="onInput"
        ></textarea>
        <button class="block__import" type="button" @click="$emit('import')">
          <AppIcon name="import" :size="12" />
          导入待办
        </button>
      </template>

      <template v-else>
        <span v-if="block.block_type === 'bullet'" class="block__bullet" aria-hidden="true"></span>
        <textarea
          ref="field"
          class="block__input"
          :class="`block__input--${block.block_type}`"
          :value="block.content"
          :placeholder="placeholder"
          rows="1"
          @input="onInput"
        ></textarea>
      </template>
    </div>
  </div>
</template>

<style scoped>
.block {
  position: relative;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-radius: var(--radius-6);
}

.block:hover {
  background: var(--color-bg-page);
}

.block__rail {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex-shrink: 0;
  padding-top: var(--space-5);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.block:hover .block__rail {
  opacity: 1;
}

.block__rail-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-4);
  color: var(--color-text-muted);
}

.block__rail-button:hover {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
}

.block__body {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: var(--space-8);
  min-width: 0;
  padding: var(--space-4) var(--space-8) var(--space-4) 0;
}

.block__input {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: inherit;
  font-size: var(--font-size-13);
  line-height: 1.75;
  color: var(--color-text-primary);
  resize: none;
}

.block__input::placeholder {
  color: var(--color-text-muted);
}

.block__input--heading {
  font-size: var(--font-size-18);
  font-weight: var(--font-weight-bold);
  line-height: 1.5;
}

.block__input--quote {
  padding-left: var(--space-12);
  border-left: 2px solid #a8bdd4;
  color: var(--color-text-secondary);
  font-style: normal;
}

.block__input--bullet {
  padding-left: var(--space-14);
}

.block__bullet {
  width: 4px;
  height: 4px;
  flex-shrink: 0;
  margin-top: 11px;
  border-radius: var(--radius-full);
  background: var(--color-text-secondary);
}

.block__divider {
  display: block;
  width: 100%;
  height: 1px;
  margin: var(--space-8) 0;
  background: var(--color-border);
}

.block__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  margin-top: 6px;
  border: 1px solid #cbb995;
  border-radius: var(--radius-4);
  color: var(--color-text-inverse);
}

.block__check--on {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.block__input--todo {
  color: var(--color-text-primary);
}

.block--checked .block__input--todo {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.block__import {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
  height: 22px;
  margin-top: 2px;
  padding: 0 var(--space-8);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-6);
  background: var(--color-bg-card);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.block:hover .block__import {
  opacity: 1;
}

.block__import:hover {
  border-color: var(--color-border-selected);
  color: var(--color-brand);
}
</style>
