<script setup lang="ts">
import AppLayout from './AppLayout.vue'
import PageState from '../components/PageState.vue'
</script>

<template>
  <AppLayout>
    <div class="page">
      <PageState forbidden forbidden-text="You do not have access." />
    </div>
  </AppLayout>
</template>
