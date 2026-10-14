<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '../stores/session'

// SVG path data for the 24x24 stroke icons shown beside each menu item.
const icons = {
  admin: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  dms: 'M3 16h18M5 16l1.8-5.5h10.4L19 16M7.5 10.5L9 7h6l1.5 3.5M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  crm: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8',
  ads: 'M4 5h16v11H8l-4 4V5zM9 10.5l2 2 4-4',
  leads: 'M3 5h18l-7 8v6l-4-2v-4L3 5z',
}

const session = useSessionStore()
const items = computed(() => {
  if (!session.hasBusinessAccess) return []
  if (session.role === 'Platform.Admin') return [{ label: 'Admin', to: '/admin', icon: icons.admin }]
  return [
    { label: 'DMS', to: '/dms', icon: icons.dms },
    { label: 'CRM', to: '/crm', icon: icons.crm },
    { label: 'Leads', to: '/leads', icon: icons.leads },
    { label: 'Ad compliance', to: '/ads', icon: icons.ads },
  ]
})
</script>

<template>
  <el-menu router :default-active="$route.path">
    <el-menu-item v-for="item in items" :key="item.to" :index="item.to">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>
      <span>{{ item.label }}</span>
    </el-menu-item>
  </el-menu>
</template>
