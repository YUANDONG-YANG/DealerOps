<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { rememberPostLoginRedirect, signIn, takePostLoginRedirect } from '../auth/msal'
import PageState from '../components/PageState.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const username = ref('')
const password = ref('')

watch(
  () => route.query.notice,
  (notice) => {
    const value = Array.isArray(notice) ? notice[0] : notice
    if (value === 'required') error.value = 'Sign in required'
    else if (value === 'profile') error.value = 'Could not load profile'
  },
  { immediate: true },
)

watch(
  () => route.query.redirect,
  (redirect) => {
    const value = Array.isArray(redirect) ? redirect[0] : redirect
    if (typeof value === 'string') rememberPostLoginRedirect(value)
  },
  { immediate: true },
)

async function login() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Enter your username and password.'
    return
  }
  loading.value = true
  try {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    rememberPostLoginRedirect(redirect)
    await signIn(username.value.trim(), password.value)
    await router.push(takePostLoginRedirect() || '/')
  } catch {
    error.value = 'Invalid username or password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <PageState :loading="loading" loading-text="Signing you in…">
      <el-card class="auth-card">
        <div class="brand">Dealer Ops</div>
        <h1>Sign in</h1>
        <p class="muted">Dealer management, CRM and ad compliance.</p>
        <el-alert v-if="error" type="error" :title="error" show-icon style="margin-bottom:12px" />
        <el-form @submit.prevent="login">
          <el-form-item>
            <el-input v-model="username" placeholder="Username" autocomplete="username" />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="password"
              type="password"
              placeholder="Password"
              autocomplete="current-password"
              show-password
            />
          </el-form-item>
          <el-button type="primary" native-type="submit" style="width:100%" :loading="loading">Sign in</el-button>
        </el-form>
      </el-card>
    </PageState>
  </div>
</template>
