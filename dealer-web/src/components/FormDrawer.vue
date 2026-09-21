<script setup lang="ts">
defineProps<{title:string;visible:boolean}>()
const emit=defineEmits<{close:[]}>()
</script>
<template><el-drawer :model-value="visible" :title="title" size="460px" @close="emit('close')"><slot/></el-drawer></template>
