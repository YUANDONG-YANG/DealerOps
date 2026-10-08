<script setup lang="ts">
import AppLayout from './AppLayout.vue'
import PageState from '../components/PageState.vue'

// Self-registered accounts wait here until the admin binds them (design/21-Feature-Extensions.md §5).
const message = 'Your account is waiting for a dealership. Ask your administrator to add you.'
</script>

<template>
  <AppLayout>
    <div class="page">
      <PageState forbidden :forbidden-text="message" />
    </div>
  </AppLayout>
</template>
