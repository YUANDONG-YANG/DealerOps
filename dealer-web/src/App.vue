<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { getReleaseTimes, type ReleaseTimes } from './api/release'

// Release time of each app (design/20-Observability.md). Web: the deploy stamp, otherwise the build time.
const web = (import.meta.env.VITE_PUBLISHED_AT || '').trim() || __WEB_BUILT_AT__
const pending: ReleaseTimes = { gateway: '…', core: '…', ai: '…' }
const backend = ref<ReleaseTimes>(pending)

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
  <footer class="app-footer">
    <div class="app-footer-title">Published (UTC)</div>
    <div>web {{ web }}</div>
    <div>gateway {{ backend.gateway }}</div>
    <div>core {{ backend.core }}</div>
    <div>ai {{ backend.ai }}</div>
  </footer>
</template>
