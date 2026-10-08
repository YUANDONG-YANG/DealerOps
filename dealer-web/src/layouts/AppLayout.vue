<script setup lang="ts">
import { computed } from 'vue'
import { signOut } from '../auth/login'
import AppMenu from '../components/AppMenu.vue'
import { useSessionStore } from '../stores/session'
const session=useSessionStore()
const isAdmin=computed(()=>session.role==='Platform.Admin')
const name=computed(()=>session.displayName||session.username||'User')
const initials=computed(()=>name.value.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''))
</script>
<template><el-container class="app-shell"><el-aside width="220px" class="app-aside"><div class="brand">Dealer Ops</div><AppMenu/></el-aside><el-container><el-header class="app-header"><span class="dealer-chip"><img v-if="!isAdmin&&session.dealerLogoDataUrl" :src="session.dealerLogoDataUrl" alt="" class="dealer-logo"/>{{isAdmin?'Platform Admin':`${session.dealerLegalName||'Dealership'} · ${session.role}`}}</span>
  <el-dropdown trigger="click">
    <span class="user-chip"><el-avatar :size="32" class="user-avatar">{{initials}}</el-avatar><span>{{name}}</span></span>
    <template #dropdown>
      <div class="profile-card">
        <el-avatar :size="48" class="user-avatar">{{initials}}</el-avatar>
        <div>
          <strong>{{name}}</strong>
          <div class="muted">@{{session.username}}</div>
          <div class="muted">{{isAdmin?'Platform Admin':session.role}}</div>
          <template v-if="!isAdmin">
            <div class="muted">{{session.dealerLegalName||'No dealership'}}</div>
            <div v-if="session.dealerContactEmail" class="muted">{{session.dealerContactEmail}}</div>
            <div v-if="session.dealerContactPhone" class="muted">{{session.dealerContactPhone}}</div>
          </template>
        </div>
      </div>
      <el-dropdown-menu><el-dropdown-item divided @click="signOut">Sign out</el-dropdown-item></el-dropdown-menu>
    </template>
  </el-dropdown>
</el-header><el-main><slot/></el-main></el-container></el-container></template>
