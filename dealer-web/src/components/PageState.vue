<script setup lang="ts">
defineProps<{loading?:boolean;empty?:boolean;error?:string;forbidden?:boolean;emptyText?:string;forbiddenText?:string;loadingText?:string}>()
</script>
<template><div v-if="loading" class="state">{{loadingText||'Loading…'}}</div><div v-else-if="forbidden" class="state danger-text">{{forbiddenText||'You do not have access.'}}</div><div v-else-if="error" class="state danger-text">{{error}}</div><div v-else-if="empty" class="state">{{emptyText||'No records found.'}}</div><slot v-else /></template>
