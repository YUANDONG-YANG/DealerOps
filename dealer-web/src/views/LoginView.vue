<script setup lang="ts">
import { ref } from 'vue'
import { signIn } from '../auth/msal'
const error=ref('')
async function login(){error.value='';try{await signIn()}catch{error.value='Sign-in failed. Try again.'}}
</script>
<template><div class="auth-shell"><el-card class="auth-card"><div class="brand">Dealer Ops</div><h1>Sign in</h1><p class="muted">Dealer management, CRM and ad compliance.</p><el-alert v-if="error" type="error" :title="error" show-icon/><el-button type="primary" style="width:100%;margin-top:18px" @click="login">Sign in with Microsoft</el-button></el-card></div></template>
