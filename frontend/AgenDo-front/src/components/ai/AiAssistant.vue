<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useAiStore } from '@/stores/ai'

const ai = useAiStore()
const route = useRoute()

const open = ref(true)
const menuOpen = ref(false)
const composer = ref(null)
const scrollArea = ref(null)

let closeTimer = null

const pendingCount = computed(() => ai.pendingCount)

const quickActions = [
  { key: 'analyze', label: '分析文件', hint: '读取上传的文档并提炼要点', icon: 'file-text' },
  { key: 'todo', label: '加到待办', hint: '把内容整理成待办清单', icon: 'square-plus' },
  { key: 'schedule', label: '生成日程', hint: '从对话中创建日程草稿', icon: 'calendar-plus' },
  { key: 'note', label: '提取笔记', hint: '把对话沉淀为备忘笔记', icon: 'notebook-pen' },
]

const scrollToBottom = async () => {
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
}

const openMenu = () => {
  clearTimeout(closeTimer)
  menuOpen.value = true
}

const scheduleCloseMenu = () => {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    menuOpen.value = false
  }, 180)
}

const runAction = (action) => {
  menuOpen.value = false
  ai.runQuickAction(action.key)
}

const send = () => ai.send()

/** 会话记录变化时同步滚动，无论消息来自浮窗还是工作台 */
watch(() => ai.messages.length, scrollToBottom)
watch(open, (value) => {
  if (value) scrollToBottom()
})

/** 进入待办 / 笔记页时自动收起，避免浮窗遮挡正文 */
watch(
  () => route.name,
  (name) => {
    if (name === 'notes' || name === 'note-detail' || name === 'todos') {
      open.value = false
      menuOpen.value = false
    }
  },
  { immediate: true },
)

const onDocumentClick = (event) => {
  if (!menuOpen.value) return
  if (composer.value && !composer.value.contains(event.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
  ai.bootstrap()
  scrollToBottom()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
  clearTimeout(closeTimer)
})
</script>

<template>
  <div class="assistant">
    <button v-if="!open" class="assistant__fab" type="button" @click="open = true">
      <AppIcon name="sparkles" :size="16" />
      <span>AI 助手</span>
      <span v-if="pendingCount" class="assistant__fab-badge">{{ pendingCount }}</span>
    </button>

    <section v-else class="panel">
      <header class="panel__head">
        <span class="panel__icon">
          <AppIcon name="sparkles" :size="14" />
        </span>
        <div class="panel__heading">
          <h3 class="panel__title">AI 助手</h3>
          <span class="panel__subtitle">基于当前工作空间 · 先计划后执行</span>
        </div>
        <button class="panel__head-button" type="button" aria-label="打开智能任务工作台" @click="ai.openTask">
          <AppIcon name="arrow-up-right" :size="14" />
        </button>
        <button class="panel__head-button" type="button" aria-label="收起" @click="open = false">
          <AppIcon name="minus" :size="14" />
        </button>
      </header>

      <div ref="scrollArea" class="panel__body">
        <ul class="messages">
          <li v-for="message in ai.messages" :key="message.id" class="message" :class="`message--${message.role}`">
            <span class="message__text">{{ message.text }}</span>
          </li>
          <li v-if="ai.thinking" class="message message--ai">
            <span class="message__text message__text--typing">正在整理你的工作空间…</span>
          </li>
        </ul>

        <section v-if="ai.pending.length" class="pending">
          <header class="pending__head">
            <AppIcon name="sparkles" :size="12" />
            <span>待确认任务</span>
            <span class="pending__count">{{ ai.pending.length }}</span>
          </header>
          <div v-for="task in ai.pending" :key="task.id" class="pending-row">
            <span class="pending-row__dot" aria-hidden="true"></span>
            <span class="pending-row__text">{{ task.title }}</span>
            <button class="pending-row__run" type="button" @click="ai.confirmPending(task, true)">执行</button>
            <button class="pending-row__skip" type="button" @click="ai.confirmPending(task, false)">拒绝</button>
          </div>
        </section>

        <p v-if="ai.queued.length" class="queued">已排队 · {{ ai.queued.length }} 项</p>
      </div>

      <footer ref="composer" class="composer">
        <div class="composer__plus-wrap" @mouseenter="openMenu" @mouseleave="scheduleCloseMenu">
          <button
            class="composer__plus"
            :class="{ 'composer__plus--active': menuOpen }"
            type="button"
            aria-label="快捷功能"
            @click="openMenu"
          >
            <AppIcon name="plus" :size="15" />
          </button>

          <div v-if="menuOpen" class="menu" @mouseenter="openMenu" @mouseleave="scheduleCloseMenu">
            <p class="menu__title">快捷功能</p>
            <button
              v-for="action in quickActions"
              :key="action.key"
              class="menu__item"
              type="button"
              @click="runAction(action)"
            >
              <span class="menu__icon">
                <AppIcon :name="action.icon" :size="14" />
              </span>
              <span class="menu__text">
                <span class="menu__label">{{ action.label }}</span>
                <span class="menu__hint">{{ action.hint }}</span>
              </span>
            </button>
          </div>
        </div>

        <input
          v-model="ai.draft"
          class="composer__input"
          type="text"
          placeholder="输入指令，或使用左侧快捷功能…"
          @keyup.enter="send"
        />

        <button class="composer__send" type="button" aria-label="发送" :disabled="!ai.draft.trim()" @click="send">
          <AppIcon name="send" :size="14" />
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.assistant {
  position: fixed;
  right: var(--space-28);
  bottom: var(--space-28);
  z-index: 30;
}

.assistant__fab {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: 40px;
  padding: 0 var(--space-14);
  border-radius: var(--radius-full);
  background: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-ai);
}

.assistant__fab:hover {
  background: #4c6d90;
}

.assistant__fab-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-ai-dot);
  font-size: var(--font-size-10);
  color: var(--color-text-inverse);
}

.panel {
  display: flex;
  flex-direction: column;
  width: var(--ai-card-width);
  height: 420px;
  overflow: visible;
  border: 1px solid #e3e8f2;
  border-radius: var(--radius-16);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
}

.panel__head {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-shrink: 0;
  padding: var(--space-12) var(--space-14);
  border-bottom: 1px solid var(--color-border);
}

.panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: var(--radius-7);
  background: var(--color-ai-button-bg);
  color: var(--color-ai-button-text);
}

.panel__heading {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.panel__title {
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-bold);
  color: #1f2a37;
}

.panel__subtitle {
  overflow: hidden;
  font-size: var(--font-size-10);
  color: #8a94a6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel__head-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
  color: #8a94a6;
}

.panel__head-button:hover {
  background: var(--color-bg-page);
  color: #1f2a37;
}

.panel__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-10);
  min-height: 0;
  padding: var(--space-12);
  overflow-y: auto;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.message {
  display: flex;
}

.message--user {
  justify-content: flex-end;
}

.message__text {
  max-width: 86%;
  padding: var(--space-7) var(--space-10);
  border-radius: var(--radius-10);
  font-size: var(--font-size-11);
  line-height: 1.65;
}

.message--user .message__text {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.message--ai .message__text {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.message__text--typing {
  color: var(--color-text-secondary);
}

.pending {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-9) var(--space-10);
  border: 1px solid #e3e8f2;
  border-radius: var(--radius-10);
  background: #fafbfd;
}

.pending__head {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
  font-size: var(--font-size-10);
  color: #8a94a6;
}

.pending__count {
  margin-left: auto;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.pending-row__dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-ai-dot);
}

.pending-row__text {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-11);
  color: #1f2a37;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-row__run,
.pending-row__skip {
  height: 20px;
  padding: 0 var(--space-7);
  border-radius: var(--radius-5);
  font-size: var(--font-size-10);
  font-weight: var(--font-weight-medium);
}

.pending-row__run {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.pending-row__skip {
  background: var(--color-chip-neutral-bg);
  color: #5b6879;
}

.queued {
  font-size: var(--font-size-10);
  color: #8a94a6;
}

.composer {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  flex-shrink: 0;
  padding: var(--space-10) var(--space-12);
  border-top: 1px solid var(--color-border);
}

.composer__plus-wrap {
  position: relative;
  flex-shrink: 0;
}

.composer__plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-7);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
}

.composer__plus:hover,
.composer__plus--active {
  background: var(--color-ai-button-bg);
  color: var(--color-ai-button-text);
}

.menu {
  position: absolute;
  bottom: 36px;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 248px;
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-hover);
}

.menu__title {
  padding: var(--space-2) var(--space-6) var(--space-4);
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-7) var(--space-6);
  border-radius: var(--radius-8);
  text-align: left;
}

.menu__item:hover {
  background: var(--color-bg-page);
}

.menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
  background: var(--color-ai-button-bg);
  color: var(--color-ai-button-text);
}

.menu__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.menu__label {
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.menu__hint {
  font-size: var(--font-size-10);
  color: var(--color-text-muted);
}

.composer__input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 var(--space-9);
  border-radius: var(--radius-7);
  background: var(--color-bg-input);
  font-size: var(--font-size-11);
}

.composer__input::placeholder {
  color: var(--color-text-muted);
}

.composer__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-7);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.composer__send:disabled {
  background: var(--color-progress-fill);
  cursor: default;
}
</style>
