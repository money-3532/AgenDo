<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { TODAY_KEY, formatDateCN, formatTime, formatTimeRange, toDateKey } from '@/utils/date'
import { useAiStore } from '@/stores/ai'

const props = defineProps({
  taskData: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm', 'cancel'])

const ai = useAiStore()
const chatArea = ref(null)
const menuOpen = ref(false)

const task = computed(() => props.taskData?.task || null)
const steps = computed(() => props.taskData?.steps || [])
const changes = computed(() => props.taskData?.changes || [])

const scrollChat = async () => {
  await nextTick()
  if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight
}

watch(
  () => props.taskData,
  (value) => {
    if (value) scrollChat()
  },
)

const createdLabel = computed(() => {
  const raw = task.value?.created_at
  if (!raw) return ''
  const stamp = toDateKey(new Date(raw)) === TODAY_KEY ? `今天 ${formatTime(raw)}` : `${formatDateCN(raw.slice(0, 10))} ${formatTime(raw)}`
  return `任务创建于 ${stamp}`
})

const stepState = (step) => {
  if (step.status === 'completed') return 'done'
  if (step.status === 'awaiting_confirmation') return 'waiting'
  return 'pending'
}

const doneCount = computed(() => steps.value.filter((step) => step.status === 'completed').length)
const confirmLabel = computed(() => `确认并修改 ${changes.value.length} 项目程`)

const changeDate = (change) => formatDateCN(String(change.before_json?.start_at || '').slice(0, 10))
const rangeOf = (json) => formatTimeRange(json?.start_at, json?.end_at)

const prompts = [
  { icon: 'file-text', label: '分析这个文件' },
  { icon: 'square-check', label: '加到待办' },
  { icon: 'calendar-plus', label: '生成日程' },
  { icon: 'notebook-pen', label: '提取笔记内容' },
]

const pickPrompt = (item) => {
  ai.draft = item.label
  menuOpen.value = false
}
</script>

<template>
  <div v-if="taskData" class="ai-root">
    <div class="ai-root__mask" @click="$emit('close')"></div>

    <aside class="ai-drawer" role="dialog" aria-modal="true" aria-label="智能任务工作台">
      <header class="ai-drawer__head">
        <div class="ai-drawer__identity">
          <span class="ai-drawer__icon">
            <AppIcon name="sparkles" :size="15" />
          </span>
          <div class="ai-drawer__heading">
            <h2 class="ai-drawer__title">智能任务工作台</h2>
            <span class="ai-drawer__subtitle">{{ createdLabel }}</span>
          </div>
        </div>
        <button class="ai-drawer__close" type="button" aria-label="关闭" @click="$emit('close')">
          <AppIcon name="x" :size="17" />
        </button>
      </header>

      <div class="ai-drawer__body" :class="{ 'ai-drawer__body--loading': loading }">
        <section class="instruction">
          <span class="instruction__label">
            <AppIcon name="text-quote" :size="11" />
            你的原始指令
          </span>
          <p class="instruction__text">{{ task?.instruction }}</p>
        </section>

        <div class="status-row">
          <span class="status-pill">等待确认</span>
          <span class="status-row__text">已完成 {{ doneCount }} / {{ steps.length }} 步</span>
        </div>

        <section class="plan">
          <header class="plan__head">
            <h3 class="plan__title">执行计划</h3>
            <span class="plan__note">先分析，后执行</span>
          </header>

          <article
            v-for="step in steps"
            :key="step.id"
            class="step"
            :class="`step--${stepState(step)}`"
          >
            <header class="step__head">
              <span class="step__icon">
                <AppIcon
                  :name="stepState(step) === 'waiting' ? 'alert-triangle' : 'check'"
                  :size="11"
                  :stroke-width="2.4"
                />
              </span>
              <span class="step__name">{{ step.operation }}</span>
              <span class="step__state">
                {{ stepState(step) === 'done' ? '已完成' : stepState(step) === 'waiting' ? '待你确认' : '待执行' }}
              </span>
            </header>
            <p v-if="step.tool" class="step__tool">调用工具：{{ step.tool }}</p>
            <p v-if="step.summary" class="step__summary">{{ step.summary }}</p>
          </article>
        </section>

        <section class="changes">
          <header class="changes__head">
            <h3 class="changes__title">变更预览</h3>
            <span class="changes__badge">无时间冲突</span>
          </header>

          <div class="changes__card">
            <div v-for="(change, index) in changes" :key="change.id" class="change" :class="{ 'change--divided': index }">
              <div class="change__head">
                <span class="change__name">{{ change.target_entry?.title }}</span>
                <span class="change__date">{{ changeDate(change) }}</span>
              </div>
              <p class="change__time">
                <span>{{ rangeOf(change.before_json) }}</span>
                <AppIcon name="arrow-right" :size="11" />
                <span class="change__after">{{ rangeOf(change.after_json) }}</span>
              </p>
            </div>
            <p class="changes__hint">
              <AppIcon name="shield" :size="11" />
              尚未修改任何日程，请检查后确认。
            </p>
          </div>
        </section>

        <button class="ai-confirm" type="button" @click="$emit('confirm')">
          <AppIcon name="check" :size="13" :stroke-width="2.4" />
          {{ confirmLabel }}
        </button>
      </div>

      <footer class="composer">
        <div ref="chatArea" class="composer__menu" v-show="menuOpen">
          <button v-for="item in prompts" :key="item.label" class="composer__prompt" type="button" @click="pickPrompt(item)">
            <AppIcon :name="item.icon" :size="13" />
            {{ item.label }}
          </button>
        </div>

        <label class="composer__field">
          <button class="composer__icon" type="button" aria-label="添加内容" @click="menuOpen = !menuOpen">
            <AppIcon name="plus" :size="15" />
          </button>
          <button class="composer__icon" type="button" aria-label="添加附件">
            <AppIcon name="paperclip" :size="15" />
          </button>
          <button class="composer__icon" type="button" aria-label="AI 辅助">
            <AppIcon name="sparkles" :size="15" />
          </button>
          <input
            v-model="ai.draft"
            type="text"
            placeholder="继续补充要求，例如：提醒也一起改…"
            @keyup.enter="ai.send()"
          />
          <button
            class="composer__send"
            type="button"
            aria-label="发送"
            :disabled="!ai.draft.trim() || ai.thinking"
            @click="ai.send()"
          >
            <AppIcon name="arrow-right" :size="14" />
          </button>
        </label>

        <div class="composer__foot">
          <button type="button" class="composer__link" @click="$emit('cancel')">终止任务</button>
          <button type="button" class="composer__link">历史对话</button>
        </div>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.ai-root {
  position: fixed;
  inset: 0;
  z-index: 45;
}

.ai-root__mask {
  position: absolute;
  inset: 0;
  background: var(--color-mask);
}

.ai-drawer {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: var(--drawer-width);
  height: 100%;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-drawer);
}

.ai-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: var(--space-16) var(--space-20) var(--space-12);
}

.ai-drawer__identity {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.ai-drawer__icon {
  display: flex;
  color: var(--color-brand);
}

.ai-drawer__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ai-drawer__title {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.ai-drawer__subtitle {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.ai-drawer__close {
  display: flex;
  color: var(--color-text-secondary);
}

.ai-drawer__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-14);
  padding: 0 var(--space-20) var(--space-20);
  overflow-y: auto;
}

.ai-drawer__body--loading {
  opacity: 0.6;
}

.instruction {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-10) var(--space-12);
  border-radius: var(--radius-8);
  background: var(--color-bg-page);
}

.instruction__label {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.instruction__text {
  font-size: var(--font-size-11);
  line-height: 1.7;
  color: var(--color-text-primary);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-pill {
  padding: var(--space-3) var(--space-8);
  border-radius: var(--radius-4);
  background: var(--color-tag-amber-bg);
  font-size: var(--font-size-10);
  color: var(--color-tag-amber-text);
}

.status-row__text {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.plan {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.plan__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan__title {
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.plan__note {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-9) var(--space-10);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.step--waiting {
  border-color: #e6d3ac;
  background: #fffdf6;
}

.step__head {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.step__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-tag-green-bg);
  color: var(--color-tag-green-text);
}

.step--waiting .step__icon {
  background: var(--color-tag-amber-bg);
  color: var(--color-tag-amber-text);
}

.step__name {
  flex: 1;
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.step__state {
  font-size: var(--font-size-9);
  color: var(--color-tag-green-text);
}

.step--waiting .step__state {
  color: var(--color-tag-amber-text);
}

.step__tool {
  padding-left: var(--space-20);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.step__summary {
  padding-left: var(--space-20);
  font-size: var(--font-size-10);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.changes {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.changes__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.changes__title {
  font-size: var(--font-size-11);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.changes__badge {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-4);
  background: var(--color-tag-green-bg);
  font-size: var(--font-size-9);
  color: var(--color-tag-green-text);
}

.changes__card {
  padding: var(--space-10);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.change {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6) 0;
}

.change--divided {
  border-top: 1px solid var(--color-border);
}

.change__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-6);
}

.change__name {
  font-size: var(--font-size-11);
  color: var(--color-text-primary);
}

.change__date {
  font-size: var(--font-size-9);
  color: var(--color-text-muted);
}

.change__time {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  font-size: var(--font-size-10);
  color: var(--color-text-secondary);
}

.change__after {
  color: var(--color-brand);
}

.changes__hint {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding-top: var(--space-8);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-9);
  color: var(--color-text-muted);
}

.ai-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  flex-shrink: 0;
  height: 34px;
  border-radius: var(--radius-8);
  background: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.ai-confirm:hover {
  background: #4c6d90;
}

.composer {
  position: relative;
  flex-shrink: 0;
  padding: var(--space-12) var(--space-20) var(--space-14);
  border-top: 1px solid var(--color-border);
}

.composer__menu {
  position: absolute;
  bottom: calc(100% - var(--space-12));
  left: var(--space-20);
  z-index: 3;
  display: flex;
  flex-direction: column;
  width: 200px;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-10);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
}

.composer__prompt {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 30px;
  padding: 0 var(--space-8);
  border-radius: var(--radius-6);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  text-align: left;
}

.composer__prompt:hover {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.composer__field {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: 40px;
  padding: 0 var(--space-8);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-10);
  background: var(--color-bg-card);
}

.composer__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-5);
  color: var(--color-text-muted);
}

.composer__icon:hover {
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
}

.composer__field input {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-11);
}

.composer__field input::placeholder {
  color: var(--color-text-muted);
}

.composer__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.composer__send:disabled {
  background: var(--color-border-input);
  cursor: default;
}

.composer__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-24);
  padding-top: var(--space-8);
}

.composer__link {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.composer__link:hover {
  color: var(--color-text-secondary);
}
</style>
