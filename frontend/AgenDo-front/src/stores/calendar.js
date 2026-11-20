import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import {
  getCalendar,
  getEntry,
  getSidebarSummary,
  createEntry,
  updateEntry,
  updateEntryTags,
  deleteEntry,
} from '@/api'
import {
  buildMonthCells,
  toDateKey,
  formatMonthCN,
  formatDateCN,
  formatDateWithWeekday,
  parseDateKey,
  addDays,
  WEEKDAY_LABELS,
  TODAY_KEY,
} from '@/utils/date'
import { relatedEntries } from '@/utils/entries'

const TYPE_ORDER = { event: 0, todo: 1, note: 2 }

/** 悬浮窗关闭延时：留出从条目移到浮层的时间 */
const HOVER_HIDE_DELAY = 400
let hoverHideTimer = 0
let hoverPreviewHovered = false

export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    loading: false,
    summary: null,
    cursor: new Date(),
    activeDate: TODAY_KEY,
    view: 'month',
    sidebarWidth: 280,
    sidebarHidden: false,
    sidebarDragging: false,
    filters: { tagId: null, type: null, includeCompleted: true },
    entries: [],
    details: {},
    tags: [],
    entryTags: [],
    overview: null,
    navCounts: { calendar: 0, todos: 0, notes: 0 },
    drawerEntry: null,
    drawerLoading: false,
    hoverPreview: { visible: false, entry: null, x: 0, y: 0 },
  }),

  getters: {
    monthLabel: (state) => formatMonthCN(state.cursor),
    monthRange: (state) => {
      const year = state.cursor.getFullYear()
      const month = state.cursor.getMonth() + 1
      const lastDay = new Date(year, state.cursor.getMonth() + 1, 0).getDate()
      return {
        from: toDateKey(new Date(year, state.cursor.getMonth(), 1)),
        to: toDateKey(new Date(year, state.cursor.getMonth(), lastDay)),
        year,
        month,
      }
    },
    /** 日 / 周视图需要前后各多看一周，避免跨月留白 */
    fetchRange() {
      const { from, to } = this.monthRange
      return {
        from: toDateKey(addDays(parseDateKey(from), -7)),
        to: toDateKey(addDays(parseDateKey(to), 7)),
      }
    },
    viewLabel() {
      if (this.view === 'day') return formatDateWithWeekday(this.activeDate)
      if (this.view === 'week') {
        const days = this.visibleDays
        return `${formatDateCN(days[0].key)} — ${formatDateCN(days[6].key)}`
      }
      return formatMonthCN(this.cursor)
    },
    /** 日视图返回 1 天，周视图返回 7 天（周一至周日） */
    visibleDays() {
      if (this.view === 'day') {
        const date = parseDateKey(this.activeDate)
        return [
          {
            key: this.activeDate,
            day: date.getDate(),
            label: `${date.getMonth() + 1}/${date.getDate()}`,
            weekday: WEEKDAY_LABELS[(date.getDay() + 6) % 7],
            isToday: this.activeDate === TODAY_KEY,
            isOutside: false,
          },
        ]
      }
      const base = parseDateKey(this.activeDate)
      const offset = (base.getDay() + 6) % 7
      const monday = addDays(base, -offset)
      return WEEKDAY_LABELS.map((weekday, index) => {
        const date = addDays(monday, index)
        const key = toDateKey(date)
        return {
          key,
          day: date.getDate(),
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          weekday,
          isToday: key === TODAY_KEY,
          isOutside: date.getMonth() !== this.cursor.getMonth(),
        }
      })
    },
    cells() {
      const { year, month } = this.monthRange
      return buildMonthCells({ year, month })
    },
    /** 已被日程关联的待办 / 备忘 id：这些条目只在日程悬浮窗内展示，不在日历表面列举 */
    linkedEntryIds(state) {
      const ids = new Set()
      for (const entry of state.entries) {
        if (entry.type !== 'event') continue
        for (const ref of entry.related_refs || []) {
          if (ref?.id) ids.add(ref.id)
        }
      }
      return ids
    },
    entriesByDate() {
      const map = {}
      const linked = this.linkedEntryIds
      for (const entry of this.entries) {
        if (entry.type !== 'event' && linked.has(entry.id)) continue
        // 日程按 start_at 归位；待办 / 备忘按「导入到日程」的日期归位，同一条可出现在多个日期
        const keys =
          entry.type === 'event'
            ? [this.details[entry.id]?.dateKey].filter(Boolean)
            : entry.imported_dates || []
        for (const key of keys) {
          if (!map[key]) map[key] = []
          map[key].push(entry)
        }
      }
      Object.values(map).forEach((list) => {
        list.sort((a, b) => {
          const orderDiff = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
          if (orderDiff !== 0) return orderDiff
          return (this.details[a.id]?.sortKey || '').localeCompare(this.details[b.id]?.sortKey || '')
        })
      })
      return map
    },
    activeTag() {
      return this.filters.tagId ? this.tags.find((tag) => tag.id === this.filters.tagId) : null
    },
    listGroups: (state) => {
      const keys = Object.keys(this.entriesByDate).sort()
      return keys.map((key) => ({ dateKey: key, entries: this.entriesByDate[key] }))
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const { from, to } = this.fetchRange
        const data = await getCalendar({
          from,
          to,
          tag_id: this.filters.tagId,
          type: this.filters.type,
          include_completed: this.filters.includeCompleted,
        })
        this.entries = data.entries
        this.tags = data.tags
        this.entryTags = data.entry_tags
        this.overview = data.overview
        this.navCounts = data.nav_counts
        this.details = this.buildDetails(data)
      } finally {
        this.loading = false
      }
    },

    buildDetails(data) {
      const details = {}
      const events = new Map(data.calendar_event_details.map((item) => [item.entry_id, item]))
      const todos = new Map(data.todo_details.map((item) => [item.entry_id, item]))
      const notes = new Map(data.note_details.map((item) => [item.entry_id, item]))
      const tagsByEntry = data.entry_tags.reduce((acc, relation) => {
        const tag = data.tags.find((item) => item.id === relation.tag_id)
        if (!tag) return acc
        if (!acc[relation.entry_id]) acc[relation.entry_id] = []
        acc[relation.entry_id].push(tag)
        return acc
      }, {})

      for (const entry of data.entries) {
        if (entry.type === 'event') {
          const detail = events.get(entry.id)
          details[entry.id] = {
            ...detail,
            dateKey: detail?.start_at?.slice(0, 10) || '',
            sortKey: detail?.start_at || '',
          }
        } else if (entry.type === 'todo') {
          const detail = todos.get(entry.id)
          details[entry.id] = {
            ...detail,
            dateKey: detail?.due_at?.slice(0, 10) || '',
            sortKey: detail?.due_at || '',
          }
        } else {
          const detail = notes.get(entry.id)
          details[entry.id] = {
            ...detail,
            dateKey: entry.created_at.slice(0, 10),
            sortKey: entry.created_at,
          }
        }
        details[entry.id].tags = tagsByEntry[entry.id] || []
      }
      return details
    },

    async loadSummary() {
      this.summary = await getSidebarSummary()
    },

    setView(view) {
      this.view = view
      if (view === 'day' || view === 'week') {
        const monthKey = toDateKey(this.cursor).slice(0, 7)
        if (!this.activeDate.startsWith(monthKey)) {
          this.activeDate = `${monthKey}-01`
        }
      }
    },

    setTag(tagId) {
      this.filters.tagId = tagId
      this.load()
    },

    setType(type) {
      this.filters.type = type
      this.load()
    },

    toggleIncludeCompleted() {
      this.filters.includeCompleted = !this.filters.includeCompleted
      this.load()
    },

    clearFilters() {
      this.filters.tagId = null
      this.filters.type = null
      this.load()
    },

    /** 往前 / 往后翻页：月视图按月，周视图按周，日视图按天 */
    async shift(offset) {
      if (this.view === 'week' || this.view === 'day') {
        const step = this.view === 'week' ? offset * 7 : offset
        this.activeDate = toDateKey(addDays(parseDateKey(this.activeDate), step))
        const next = parseDateKey(this.activeDate)
        this.cursor = new Date(next.getFullYear(), next.getMonth(), 1)
      } else {
        this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + offset, 1)
      }
      await this.load()
    },

    async shiftMonth(offset) {
      await this.shift(offset)
    },

    async goToday() {
      this.activeDate = TODAY_KEY
      this.cursor = new Date()
      await this.load()
    },

    /** 打开新建草稿（日程 / 待办 / 笔记） */
    openDraft({ type = 'event', dateKey = TODAY_KEY, hour = 9 } = {}) {
      this.hoverPreview.visible = false
      const startHour = String(Math.min(23, Math.max(0, hour))).padStart(2, '0')
      const endHour = String(Math.min(23, Math.max(0, hour) + 1)).padStart(2, '0')
      this.drawerEntry = {
        id: 'draft',
        user_id: 'user-1',
        type,
        title: '',
        description: '',
        completion_status: type === 'todo' ? 'pending' : null,
        tags: [],
        linked_notes: [],
        detail:
          type === 'todo'
            ? { due_at: `${dateKey}T18:00:00+08:00`, completed_at: null }
            : {
                start_at: `${dateKey}T${startHour}:00:00+08:00`,
                end_at: `${dateKey}T${endHour}:00:00+08:00`,
                is_all_day: false,
                recurrence_rule: null,
                reminder_minutes: 15,
              },
      }
    },

    async openEntry(entryId) {
      this.drawerLoading = true
      this.hoverPreview.visible = false
      try {
        this.drawerEntry = await getEntry(entryId)
      } finally {
        this.drawerLoading = false
      }
    },

    /** 保存抽屉里的条文条目：draft 走新建，其余走更新（只写本地 mock） */
    async saveEntry(payload) {
      const entry = this.drawerEntry
      if (!entry) return
      const title = (payload?.title || entry.title || '').trim() || '未命名条目'
      const description = payload?.description ?? entry.description ?? ''
      if (entry.id === 'draft') {
        const created = await createEntry({ type: entry.type, title, description, detail: entry.detail || {} })
        if (payload?.tags?.length) await updateEntryTags(created.id, payload.tags.map((tag) => tag.id))
      } else {
        await updateEntry(entry.id, {
          title,
          description,
          completion_status: payload?.completionStatus,
          priority: payload?.priority,
        })
        if (payload?.tags) await updateEntryTags(entry.id, payload.tags.map((tag) => tag.id))
      }
      this.closeEntry()
      await this.load()
    },

    async removeEntry(id) {
      await deleteEntry(id)
      this.closeEntry()
      await this.load()
    },

    closeEntry() {
      this.drawerEntry = null
    },

    showHoverPreview(entry, event) {
      this.cancelHideHoverPreview()
      hoverPreviewHovered = false
      const detail = this.details[entry.id] || null
      const dayKey = detail?.dateKey
      const related = relatedEntries(this.entriesByDate[dayKey] || [], entry.id).map((item) => ({
        entry: item,
        detail: this.details[item.id] || null,
      }))

      // 以被悬浮条目为锚点：优先右侧、空间不足翻左侧，纵向按视口收敛
      const HOVER_PREVIEW_WIDTH = 196
      const HOVER_PREVIEW_HEIGHT = 190
      const GAP = 10
      const MARGIN = 12
      const anchorEl = event?.currentTarget || event?.target || null
      const anchor = anchorEl?.getBoundingClientRect?.()
      const pointerX = Number.isFinite(event?.clientX) ? event.clientX : MARGIN
      const pointerY = Number.isFinite(event?.clientY) ? event.clientY : MARGIN
      const anchorLeft = anchor?.left ?? pointerX
      const anchorRight = anchor?.right ?? pointerX
      const anchorTop = anchor?.top ?? pointerY
      const anchorBottom = anchor?.bottom ?? pointerY
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let x = anchorRight + GAP
      if (x + HOVER_PREVIEW_WIDTH + MARGIN > viewportWidth) {
        x = anchorLeft - HOVER_PREVIEW_WIDTH - GAP
      }
      x = Math.max(MARGIN, Math.min(x, viewportWidth - HOVER_PREVIEW_WIDTH - MARGIN))

      let y = anchorTop - 6
      if (y + HOVER_PREVIEW_HEIGHT + MARGIN > viewportHeight) {
        y = anchorBottom - HOVER_PREVIEW_HEIGHT
      }
      y = Math.max(MARGIN, Math.min(y, viewportHeight - HOVER_PREVIEW_HEIGHT - MARGIN))

      this.hoverPreview = {
        visible: true,
        entry,
        detail,
        related,
        x,
        y,
        anchorEl: anchorEl ? markRaw(anchorEl) : null,
      }
    },

    hideHoverPreview() {
      this.cancelHideHoverPreview()
      hoverPreviewHovered = false
      this.hoverPreview.visible = false
    },

    handleHoverPreviewEnter() {
      hoverPreviewHovered = true
      this.cancelHideHoverPreview()
    },

    scheduleHideHoverPreview() {
      this.cancelHideHoverPreview()
      hoverHideTimer = setTimeout(() => {
        if (!hoverPreviewHovered) this.hoverPreview.visible = false
      }, HOVER_HIDE_DELAY)
    },

    cancelHideHoverPreview() {
      clearTimeout(hoverHideTimer)
      hoverHideTimer = 0
    },
  },
})
