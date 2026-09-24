<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { rememberPostLoginRedirect, signIn } from '../auth/msal'
import PageState from '../components/PageState.vue'

const route = useRoute()
const loading = ref(false)
const error = ref('')

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
  loading.value = true
  try {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    rememberPostLoginRedirect(redirect)
    await signIn()
  } catch {
    error.value = 'Sign-in failed. Try again.'
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
        <el-alert v-if="error" type="error" :title="error" show-icon />
        <el-button type="primary" style="width:100%;margin-top:18px" @click="login">Sign in with Microsoft</el-button>
      </el-card>
    </PageState>
  </div>
</template>
