<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  user: { type: Object, default: null },
})
const emit = defineEmits(['new-account', 'switch-account', 'sign-out'])

const open = ref(false)
const root = ref(null)

const toggle = () => {
  open.value = !open.value
}

const close = () => {
  open.value = false
}

const onDocumentPointerDown = (event) => {
  if (root.value && !root.value.contains(event.target)) close()
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<template>
  <div v-if="user" ref="root" class="account-wrap">
    <button class="account" type="button" :aria-expanded="open" @click="toggle">
      <span class="account__avatar">{{ user.short_name }}</span>
      <div class="account__info">
        <span class="account__name">{{ user.name }}</span>
        <span class="account__workspace">{{ user.workspace }}</span>
      </div>
      <AppIcon name="chevrons-up-down" :size="14" class="account__switch" />
    </button>

    <div v-if="open" class="account-pop">
      <div class="account-pop__head">
        <span class="account-pop__avatar">{{ user.short_name }}</span>
        <div class="account-pop__titles">
          <span class="account-pop__name">{{ user.name }}</span>
          <span class="account-pop__workspace">{{ user.workspace }} · 免费版</span>
        </div>
      </div>
      <span class="account-pop__divider" aria-hidden="true"></span>
      <button class="account-pop__item" type="button" @click="emit('new-account'); close()">
        新建账号
      </button>
      <button class="account-pop__item" type="button" @click="emit('switch-account'); close()">
        切换账号
      </button>
      <button class="account-pop__item" type="button" @click="emit('sign-out'); close()">
        退出登录
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-wrap {
  position: relative;
  width: 100%;
}

.account {
  display: flex;
  align-items: center;
  gap: var(--space-9);
  width: 100%;
  text-align: left;
}

.account__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-border-input);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-bold);
  color: var(--color-brand);
}

.account__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.account__name {
  overflow: hidden;
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__workspace {
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__switch {
  color: var(--color-text-secondary);
}

.account-pop {
  position: absolute;
  left: 50%;
  bottom: calc(100% + var(--space-8));
  z-index: 40;
  width: 216px;
  padding: var(--space-6);
  transform: translateX(-50%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  background: var(--color-bg-card);
  box-shadow: 0 12px 28px -4px rgba(38, 61, 89, 0.16);
}

.account-pop__head {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  height: 44px;
  padding: 0 var(--space-8);
}

.account-pop__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-border-input);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-bold);
  color: var(--color-brand);
}

.account-pop__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.account-pop__name {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.account-pop__workspace {
  overflow: hidden;
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-pop__divider {
  display: block;
  height: 1px;
  margin: 0 var(--space-8) var(--space-4);
  background: #eff3f8;
}

.account-pop__item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 34px;
  padding: 0 var(--space-10);
  border-radius: var(--radius-6);
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
  text-align: left;
}

.account-pop__item:hover {
  background: var(--color-bg-page);
}
</style>
