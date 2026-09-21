<script setup lang="ts">
defineProps<{card:any}>()
</script>
<template><el-card class="assistant-card" @click="$emit('open')"><strong>{{card.label}}</strong><div class="muted">{{card.kind }} · {{ card.status }}</div></el-card></template>
