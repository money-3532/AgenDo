<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import NoteEditor from '@/components/notes/NoteEditor.vue'

const route = useRoute()
const router = useRouter()
const ws = useWorkspaceStore()

const activeNote = computed(() => ws.notes.find((note) => note.id === route.params.id) || null)

onMounted(() => {
  if (!ws.notes.length) ws.loadNotes()
})

watch(
  () => [ws.notes.length, route.params.id],
  () => {
    if (!ws.notes.length) return
    if (!route.params.id || !ws.notes.some((note) => note.id === route.params.id)) {
      router.replace(`/notes/${ws.notes[0].id}`)
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <NoteEditor v-if="activeNote" :note="activeNote" />

    <div v-else class="placeholder">
      <span class="placeholder__icon">
        <AppIcon name="notebook-pen" :size="20" />
      </span>
      <p class="placeholder__title">正在打开笔记…</p>
      <p class="placeholder__hint">在左侧列表选择一篇笔记，或点击加号新建。</p>
    </div>
  </AppLayout>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
}

.placeholder__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-12);
  background: var(--color-tag-purple-bg);
  color: var(--color-tag-purple-text);
}

.placeholder__title {
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.placeholder__hint {
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}
</style>
