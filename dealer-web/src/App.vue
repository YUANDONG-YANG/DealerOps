<script setup lang="ts">
import { RouterView } from 'vue-router'

const publishedAt = (import.meta.env.VITE_PUBLISHED_AT || '').trim() || 'local'
</script>
<template>
  <RouterView />
  <footer style="position:fixed;right:12px;bottom:8px;z-index:30;font-size:12px;color:#6b7280">
    Published {{ publishedAt }}
  </footer>
</template>
