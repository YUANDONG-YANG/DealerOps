<script setup lang="ts">
defineProps<{ visible: boolean; title?: string; message?: string; confirmLabel?: string; confirmText?: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
<template>
  <el-dialog :model-value="visible" :title="title || 'Confirm'" width="380px" @close="emit('cancel')">
    <slot>
      <p>{{ message || 'Are you sure?' }}</p>
    </slot>
    <template #footer>
      <el-button @click="emit('cancel')">Cancel</el-button>
      <el-button type="primary" @click="emit('confirm')">{{ confirmLabel || confirmText || 'Confirm' }}</el-button>
    </template>
  </el-dialog>
</template>
