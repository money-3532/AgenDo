import { defineStore } from 'pinia'
import { getAiAssistant, getAiTask } from '@/api'
import { useWorkspaceStore } from '@/stores/workspace'

let replyTimer = null

const smartReply = (text) => {
  if (text.includes('日程') || text.includes('会议')) {
    return '我可以先把日程草稿列出来：明天 10:00 — 11:00「产品方案评审」，需要我确认时间冲突吗？'
  }
  if (text.includes('待办') || text.includes('任务')) {
    return '我整理出 3 项待办，建议优先完成「整理用户访谈记录」，其余可以排到本周后半段。'
  }
  if (text.includes('笔记') || text.includes('总结')) {
    return '已为你生成一段摘要，可以一键存成笔记，并保留来源条目的链接。'
  }
  return '收到，我会先给出执行计划，确认后再改动你的数据。'
}

/**
 * AI 会话的唯一数据源：AI 助手浮窗与智能任务工作台共用同一份消息、
 * 待确认任务与执行计划，避免两处各自维护历史。
 */
export const useAiStore = defineStore('ai', {
  state: () => ({
    loading: false,
    loaded: false,
    messages: [],
    pending: [],
    queued: [],
    thinking: false,
    draft: '',
    task: null,
    taskLoading: false,
    seq: 0,
  }),

  getters: {
    pendingCount: (state) => state.pending.length,
    planTask: (state) => state.task?.task || null,
    planSteps: (state) => state.task?.steps || [],
    planChanges: (state) => state.task?.changes || [],
  },

  actions: {
    async bootstrap() {
      if (this.loaded || this.loading) return
      this.loading = true
      try {
        const data = await getAiAssistant()
        this.messages = data.messages
        this.pending = data.pending
        this.queued = data.queued
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    pushMessage(role, text) {
      this.seq += 1
      this.messages.push({ id: `msg-local-${this.seq}`, role, text })
    },

    reply(text, delay = 700) {
      this.thinking = true
      clearTimeout(replyTimer)
      replyTimer = setTimeout(() => {
        this.thinking = false
        this.pushMessage('ai', text)
      }, delay)
    },

    /** 浮窗与工作台共用同一个输入草稿和发送入口 */
    send(raw) {
      const text = (raw ?? this.draft).trim()
      if (!text || this.thinking) return
      this.pushMessage('user', text)
      this.draft = ''
      this.reply(smartReply(text))
    },

    runQuickAction(key) {
      const ws = useWorkspaceStore()
      if (key === 'analyze') {
        this.pushMessage('user', '分析文件：六月用户访谈纪要.pdf')
        this.reply('已读取文件，提取到 3 条要点：快速录入、跨端同步、希望在日历内直接完成待办。')
        ws.showToast('文件已加入分析队列')
      } else if (key === 'todo') {
        ws.openListPicker({
          noteTitle: 'AI 助手',
          tasks: [{ content: '跟进访谈里提到的跨端同步问题', checked: false }],
        })
      } else if (key === 'schedule') {
        this.pushMessage('user', '把「产品方案评审」生成到明天的日程')
        this.reply('已生成日程草稿：6月19日 10:00 — 11:00「产品方案评审」，确认后即可写入日历。')
      } else if (key === 'note') {
        this.pushMessage('user', '提取这段对话为笔记')
        this.reply('已提取笔记草稿「沟通要点」，包含 2 条任务块，可以在备忘笔记里继续编辑。')
      }
    },

    confirmPending(task, accepted) {
      this.pending = this.pending.filter((item) => item.id !== task.id)
      if (accepted) {
        this.pushMessage('ai', `已执行：${task.title}。可在 24 小时内撤销。`)
        useWorkspaceStore().showToast('任务已执行')
      } else {
        this.pushMessage('ai', `已跳过：${task.title}。`)
      }
    },

    async openTask() {
      this.taskLoading = true
      try {
        this.task = await getAiTask('ai-task-1')
      } finally {
        this.taskLoading = false
      }
    },

    closeTask() {
      this.task = null
    },

    /** 工作台确认执行：同步更新计划步骤、待确认任务和共享对话 */
    confirmPlan() {
      if (!this.task) return
      const changes = this.task.changes.length
      const pendingCount = this.pending.length
      this.pending = []
      this.task = {
        ...this.task,
        steps: this.task.steps.map((step) => ({ ...step, status: 'completed' })),
      }
      this.pushMessage(
        'ai',
        `已执行任务计划：完成 ${changes} 项日程调整${pendingCount ? `、${pendingCount} 项待确认任务` : ''}，可在 24 小时内撤销。`,
      )
      useWorkspaceStore().showToast('任务计划已执行')
      this.closeTask()
    },
  },
})
