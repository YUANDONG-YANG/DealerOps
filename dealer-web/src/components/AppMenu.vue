<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const items = computed(() => {
  if (!session.hasBusinessAccess) return []
  if (session.role === 'Platform.Admin') return [{ label: 'Admin', to: '/admin' }]
  return [
    { label: 'DMS', to: '/dms' },
    { label: 'CRM', to: '/crm' },
    { label: 'Ad compliance', to: '/ads' },
    { label: 'Assistant', to: '/assistant' },
  ]
})
</script>

<template>
  <el-menu router :default-active="$route.path">
    <el-menu-item v-for="item in items" :key="item.to" :index="item.to">{{ item.label }}</el-menu-item>
  </el-menu>
</template>
