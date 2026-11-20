<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { login } from '@/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(true)
const loading = ref(false)
const error = ref('')

const metrics = [
  { value: '20,000+', label: '企业客户' },
  { value: '99.9%', label: '服务可用性' },
  { value: '150+', label: '国家和地区' },
]

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    await login({ email: email.value, password: password.value })
    router.push('/')
  } catch (err) {
    error.value = err.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="login__hero">
      <div class="hero__brand">
        <span class="hero__logo">
          <AppIcon name="box" :size="18" />
        </span>
        <span class="hero__name">AgenDo</span>
      </div>

      <div class="hero__content">
        <h1 class="hero__slogan">让团队协作<br />更简单、更高效</h1>
        <p class="hero__desc">一站式项目管理与团队协作平台，帮助 20000+ 企业提升交付效率。</p>
      </div>

      <ul class="hero__metrics">
        <li v-for="item in metrics" :key="item.label" class="metric">
          <span class="metric__value">{{ item.value }}</span>
          <span class="metric__label">{{ item.label }}</span>
        </li>
      </ul>
    </section>

    <section class="login__panel">
      <form class="login-form" @submit.prevent="submit">
        <header class="login-form__head">
          <h2 class="login-form__title">欢迎回来</h2>
          <p class="login-form__subtitle">登录你的账户，继续今天的工作</p>
        </header>

        <div class="login-form__fields">
          <label class="field">
            <span class="field__label">工作邮箱</span>
            <span class="field__control">
              <AppIcon name="mail" :size="15" />
              <input v-model="email" type="email" placeholder="name@company.com" autocomplete="email" />
            </span>
          </label>

          <label class="field">
            <span class="field__label">密码</span>
            <span class="field__control">
              <AppIcon name="lock" :size="15" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button class="field__eye" type="button" aria-label="切换密码可见" @click="showPassword = !showPassword">
                <AppIcon name="eye" :size="15" />
              </button>
            </span>
          </label>
        </div>

        <div class="login-form__row">
          <button class="remember" type="button" @click="remember = !remember">
            <span class="remember__box" :class="{ 'remember__box--checked': remember }">
              <AppIcon v-if="remember" name="check" :size="10" :stroke-width="2.6" />
            </span>
            记住我
          </button>
          <a class="login-form__link" href="#" @click.prevent>忘记密码？</a>
        </div>

        <p v-if="error" class="login-form__error">{{ error }}</p>

        <button class="login-form__submit" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>

        <div class="login-form__divider">或使用以下方式登录</div>

        <div class="login-form__third">
          <button class="third" type="button">
            <AppIcon name="smartphone" :size="15" />
            手机号登录
          </button>
          <button class="third" type="button">
            <AppIcon name="message-circle" :size="15" />
            微信登录
          </button>
        </div>

        <p class="login-form__signup">
          还没有账户？<a class="login-form__signup-link" href="#" @click.prevent>免费注册</a>
        </p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  min-width: 1200px;
  min-height: 100vh;
  background: var(--color-bg-card);
}

.login__hero {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-64) var(--space-80);
  overflow: hidden;
  background: linear-gradient(160deg, #e9f1fb 0%, #dce7f3 52%, #d4e0f0 100%);
}

.hero__brand {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.hero__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-8);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.hero__name {
  font-size: var(--font-size-21);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.hero__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-20);
  max-width: 620px;
}

.hero__slogan {
  font-size: var(--font-size-40);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-slogan);
  color: var(--color-brand-navy);
}

.hero__desc {
  font-size: var(--font-size-13);
  line-height: var(--line-height-subtitle);
  color: #6e7f92;
}

.hero__metrics {
  display: flex;
  gap: var(--space-52);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.metric__value {
  font-size: var(--font-size-26);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  color: var(--color-brand-navy);
}

.metric__label {
  font-size: var(--font-size-12);
  color: #7d8a9b;
}

.login__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 560px;
  padding: var(--space-64) var(--space-72);
  background: var(--color-bg-card);
}

.login-form {
  display: flex;
  flex-direction: column;
  width: 416px;
  max-width: 100%;
}

.login-form__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.login-form__title {
  font-size: var(--font-size-26);
  font-weight: var(--font-weight-bold);
  line-height: 1.35;
  color: var(--color-text-primary);
}

.login-form__subtitle {
  font-size: var(--font-size-13);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}

.login-form__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-28);
  margin-top: var(--space-32);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.field__label {
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.field__control {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  height: 46px;
  padding: 0 var(--space-14);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-10);
  background: var(--color-bg-input);
  color: var(--color-text-muted);
}

.field__control:focus-within {
  border-color: var(--color-brand);
  background: var(--color-bg-card);
}

.field__control input {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-13);
  color: var(--color-text-primary);
}

.field__control input::placeholder {
  color: var(--color-text-muted);
}

.field__eye {
  display: flex;
  color: var(--color-text-muted);
}

.field__eye:hover {
  color: var(--color-text-secondary);
}

.login-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-28);
  font-size: var(--font-size-11);
  color: var(--color-text-secondary);
}

.remember {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.remember__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-4);
  background: var(--color-bg-card);
  color: var(--color-text-inverse);
}

.remember__box--checked {
  border-color: var(--color-brand-login);
  background: var(--color-brand-login);
}

.login-form__link {
  font-size: var(--font-size-11);
  color: var(--color-text-link);
}

.login-form__error {
  margin-top: var(--space-12);
  font-size: var(--font-size-11);
  color: #b45454;
}

.login-form__submit {
  height: 48px;
  margin-top: var(--space-28);
  border-radius: var(--radius-10);
  background: var(--color-brand-login);
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
}

.login-form__submit:hover {
  background: #4a6c93;
}

.login-form__submit:disabled {
  opacity: 0.7;
  cursor: default;
}

.login-form__divider {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  margin-top: var(--space-32);
  font-size: var(--font-size-11);
  color: var(--color-text-muted);
}

.login-form__divider::before,
.login-form__divider::after {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  content: '';
}

.login-form__third {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  margin-top: var(--space-28);
}

.third {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-7);
  height: 44px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-8);
  font-size: var(--font-size-12);
  color: var(--color-text-primary);
}

.third:hover {
  border-color: var(--color-border-selected);
  background: var(--color-bg-page);
}

.third svg {
  color: var(--color-brand);
}

.login-form__signup {
  margin-top: var(--space-28);
  font-size: var(--font-size-12);
  color: var(--color-text-secondary);
  text-align: center;
}

.login-form__signup-link {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-link);
}
</style>
