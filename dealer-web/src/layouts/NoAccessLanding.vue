<script setup lang="ts">
import AppLayout from './AppLayout.vue'
import PageState from '../components/PageState.vue'
</script>

<template>
  <AppLayout>
    <div class="page">
      <PageState forbidden forbidden-text="Your account is not provisioned yet. Contact your administrator." />
    </div>
  </AppLayout>
</template>
