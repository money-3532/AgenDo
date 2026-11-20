import { defineStore } from 'pinia'
import {
  getWorkspaceMeta,
  getTodos,
  getNotes,
  toggleTodo as apiToggleTodo,
  createTag as apiCreateTag,
  importTasksToList,
  updateNoteBlock,
  addNoteBlock,
  deleteNoteBlock,
} from '@/api'

let toastTimer = null

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    loading: false,
    user: null,
    tags: [],
    tagCounts: {},
    counts: { calendar: 0, todos: 0, notes: 0 },
    todoLists: [],
    todos: [],
    todoDetails: {},
    todoLinks: [],
    todoTags: {},
    notes: [],
    notesLoading: false,
    noteBlocks: [],
    tagModalVisible: false,
    listPicker: { visible: false, noteId: null, noteTitle: '', tasks: [], defaultListId: 'list-work' },
    toast: null,
  }),

  getters: {
    pendingCountByList: (state) => {
      const counts = {}
      for (const list of state.todoLists) counts[list.id] = 0
      for (const link of state.todoLinks) {
        const entry = state.todos.find((item) => item.id === link.entry_id)
        if (!entry || entry.completion_status === 'completed') continue
        counts[link.todo_list_id] = (counts[link.todo_list_id] || 0) + 1
      }
      return counts
    },
    todosByList: (state) => {
      const map = {}
      for (const list of state.todoLists) map[list.id] = []
      for (const link of state.todoLinks) {
        const entry = state.todos.find((item) => item.id === link.entry_id)
        if (!entry || !map[link.todo_list_id]) continue
        map[link.todo_list_id].push(entry)
      }
      const sortByDue = (a, b) =>
        (state.todoDetails[a.id]?.due_at || '').localeCompare(state.todoDetails[b.id]?.due_at || '')
      Object.values(map).forEach((list) => list.sort(sortByDue))
      return map
    },
    noteById: (state) => (id) => state.notes.find((note) => note.id === id) || null,
    blocksOf: (state) => (noteId) =>
      state.noteBlocks
        .filter((block) => block.note_entry_id === noteId)
        .sort((a, b) => a.sort_order - b.sort_order),
  },

  actions: {
    async bootstrap() {
      await Promise.all([this.refreshMeta(), this.loadTodos(), this.loadNotes()])
    },

    async refreshMeta() {
      const data = await getWorkspaceMeta()
      this.user = data.user
      this.tags = data.tags
      this.tagCounts = data.tag_counts
      this.counts = data.nav_counts
      this.todoLists = [...data.todo_lists].sort((a, b) => a.sort_order - b.sort_order)
    },

    async loadTodos({ include_completed = true } = {}) {
      this.loading = true
      try {
        const data = await getTodos({ include_completed })
        this.todos = data.entries
        this.todoLists = [...data.todo_lists].sort((a, b) => a.sort_order - b.sort_order)
        this.todoLinks = data.todo_list_items
        this.todoDetails = Object.fromEntries(data.todo_details.map((detail) => [detail.entry_id, detail]))
        const tagsByEntry = {}
        for (const relation of data.entry_tags) {
          const tag = data.tags.find((item) => item.id === relation.tag_id)
          if (!tag) continue
          if (!tagsByEntry[relation.entry_id]) tagsByEntry[relation.entry_id] = []
          tagsByEntry[relation.entry_id].push(tag)
        }
        this.todoTags = tagsByEntry
        this.tags = data.tags
      } finally {
        this.loading = false
      }
    },

    async loadNotes() {
      this.notesLoading = true
      try {
        const data = await getNotes()
        this.notes = data.entries
        this.noteBlocks = data.note_blocks
        this.tags = data.tags
      } finally {
        this.notesLoading = false
      }
    },

    async toggleTodo(entryId) {
      const entry = this.todos.find((item) => item.id === entryId)
      if (!entry) return
      const next = entry.completion_status !== 'completed'
      entry.completion_status = next ? 'completed' : 'pending'
      await apiToggleTodo(entryId, next)
      await this.refreshMeta()
    },

    openTagModal() {
      this.tagModalVisible = true
    },

    closeTagModal() {
      this.tagModalVisible = false
    },

    async createTag({ name, color }) {
      if (!name.trim()) return
      await apiCreateTag({ name: name.trim(), color })
      await this.refreshMeta()
      this.tagModalVisible = false
      this.showToast(`标签「${name.trim()}」已创建`)
    },

    openListPicker({ noteId = null, noteTitle = '', tasks = [], defaultListId = 'list-work' }) {
      this.listPicker = {
        visible: true,
        noteId,
        noteTitle,
        tasks,
        defaultListId,
      }
    },

    closeListPicker() {
      this.listPicker.visible = false
    },

    async confirmImport(listId) {
      const { tasks, noteId } = this.listPicker
      if (!tasks.length) {
        this.showToast('没有可导入的任务')
        return
      }
      await importTasksToList({ note_id: noteId, list_id: listId, tasks })
      const list = this.todoLists.find((item) => item.id === listId)
      this.listPicker.visible = false
      await Promise.all([this.loadTodos(), this.refreshMeta()])
      this.showToast(`已导入 ${tasks.length} 个任务到「${list?.name || '清单'}」`)
    },

    async updateBlock(patch) {
      const block = this.noteBlocks.find((item) => item.id === patch.id)
      if (!block) return
      if (patch.content !== undefined) block.content = patch.content
      if (patch.checked !== undefined) block.checked = patch.checked
      await updateNoteBlock(patch)
    },

    async addBlock({ noteId, blockType, afterId = null }) {
      const block = await addNoteBlock({ note_entry_id: noteId, block_type: blockType, after_id: afterId })
      if (block) this.noteBlocks.push(block)
      return block
    },

    async removeBlock(blockId) {
      await deleteNoteBlock(blockId)
      this.noteBlocks = this.noteBlocks.filter((item) => item.id !== blockId)
    },

    showToast(text) {
      this.toast = text
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        this.toast = null
      }, 2400)
    },
  },
})
