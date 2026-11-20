import { createRouter, createWebHistory } from 'vue-router'
import CalendarView from '@/views/CalendarView.vue'
import TodosView from '@/views/TodosView.vue'
import NotesView from '@/views/NotesView.vue'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'calendar', component: CalendarView },
    { path: '/todos', name: 'todos', component: TodosView },
    { path: '/notes', name: 'notes', component: NotesView },
    { path: '/notes/:id', name: 'note-detail', component: NotesView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
