<script setup lang="ts">
import { RouterView } from 'vue-router'

const publishedAt = (import.meta.env.VITE_PUBLISHED_AT || '').trim() || 'local'
</script>
<template>
  <RouterView />
  <footer class="app-footer">
    Published {{ publishedAt }}
  </footer>
</template>
