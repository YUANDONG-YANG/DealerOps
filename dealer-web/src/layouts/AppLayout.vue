<script setup lang="ts">
import { signOut } from '../auth/login'
import AppMenu from '../components/AppMenu.vue'
import { useSessionStore } from '../stores/session'
const session=useSessionStore()
</script>
<template><el-container style="min-height:100vh"><el-aside width="220px" style="background:#fff"><div class="brand" style="padding:24px">Dealer Ops</div><AppMenu/></el-aside><el-container><el-header style="background:#fff;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center"><span>{{session.role==='Platform.Admin'?'Platform Admin':(session.dealerLegalName||'Dealership')}} · {{session.role}}</span><el-button text @click="signOut">Sign out</el-button></el-header><el-main><slot/></el-main></el-container></el-container></template>

