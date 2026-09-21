<script setup lang="ts">
defineProps<{visible:boolean;title?:string;message?:string}>()
const emit=defineEmits<{confirm:[];cancel:[]}>()
</script>
<template><el-dialog :model-value="visible" :title="title||'Confirm'" width="380px" @close="emit('cancel')"><p>{{message||'Are you sure?'}}</p><template #footer><el-button @click="emit('cancel')">Cancel</el-button><el-button type="primary" @click="emit('confirm')">Confirm</el-button></template></el-dialog></template>
