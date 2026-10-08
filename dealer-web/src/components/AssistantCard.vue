<script setup lang="ts">
import type { AssistantCardDto } from '../api/assistant'
defineProps<{ card: AssistantCardDto }>()
defineEmits<{ open: [] }>()
const kinds = {
  VEHICLE: { label: 'Vehicle', type: 'primary', action: 'Open in DMS' },
  CUSTOMER: { label: 'Customer', type: 'success', action: 'Open in CRM' },
  LISTING: { label: 'Ad', type: 'warning', action: 'Open in Ad compliance' },
} as const
function pretty(s?: string) {
  return s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : ''
}
</script>
<template>
  <el-card class="assistant-card" shadow="hover" tabindex="0" @click="$emit('open')" @keydown.enter="$emit('open')">
    <div class="assistant-card-head">
      <el-tag size="small" :type="kinds[card.kind].type" effect="plain">{{ kinds[card.kind].label }}</el-tag>
      <span v-if="card.status || card.checkStatus" class="muted">{{ pretty(card.status || card.checkStatus) }}</span>
    </div>
    <strong class="assistant-card-label">{{ card.label }}</strong>
    <div class="assistant-card-action">{{ kinds[card.kind].action }} →</div>
  </el-card>
</template>
