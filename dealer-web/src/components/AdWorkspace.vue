<script setup lang="ts">
import { ref } from 'vue'
const props=defineProps<{modelValue:any;result?:any}>()
const emit=defineEmits<{ 'update:modelValue':[any] }>()
const state=ref(props.modelValue)
</script>
<template><div class="ad-grid"><el-card><template #header>Advertisement</template><el-form label-position="top"><el-form-item label="Title"><el-input v-model="state.title"/></el-form-item><el-form-item label="Body"><el-input v-model="state.body" type="textarea" :rows="10"/></el-form-item><el-form-item label="Type"><el-select v-model="state.adKind" style="width:100%"><el-option label="Cash" value="CASH"/><el-option label="Finance" value="FINANCE"/><el-option label="Lease" value="LEASE"/></el-select></el-form-item><el-form-item label="Medium"><el-select v-model="state.medium" style="width:100%"><el-option label="Online" value="ONLINE"/><el-option label="Radio TV Billboard" value="RADIO_TV_BILLBOARD"/></el-select></el-form-item></el-form><slot name="actions"/></el-card><el-card class="result-pane"><template #header>Check result</template><slot name="result"><el-empty description="Select a vehicle to start."/></slot></el-card></div></template>
