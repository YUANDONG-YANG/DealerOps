<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { getReleaseTimes, type ReleaseTimes } from './api/release'
import { useSessionStore } from './stores/session'
import AssistantView from './views/AssistantView.vue'

// Release time of each app (design/20-Observability.md). Web: the deploy stamp, otherwise the build time.
const web = (import.meta.env.VITE_PUBLISHED_AT || '').trim() || __WEB_BUILT_AT__
const pending: ReleaseTimes = { gateway: '…', core: '…', ai: '…' }
const backend = ref<ReleaseTimes>(pending)
const route = useRoute()
const session = useSessionStore()
// The assistant is a floating widget on every staff page, not a route (design/AI-CODING-FRONTEND.md FE-T10).
const showAssistant = computed(() => session.role === 'Dealer.User' && session.hasBusinessAccess && !route.meta.public)

onMounted(async () => {
  try {
    backend.value = await getReleaseTimes()
  } catch {
    backend.value = { gateway: 'unavailable', core: 'unavailable', ai: 'unavailable' }
  }
})
</script>
<template>
  <RouterView />
  <AssistantView v-if="showAssistant" />
  <!-- Release times stay off the public landing page. -->
  <footer v-if="route.name !== 'home'" class="app-footer">
    <div class="app-footer-title">Published (UTC)</div>
    <div>web {{ web }}</div>
    <div>gateway {{ backend.gateway }}</div>
    <div>core {{ backend.core }}</div>
    <div>ai {{ backend.ai }}</div>
  </footer>
</template>
