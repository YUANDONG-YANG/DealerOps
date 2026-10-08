<script setup lang="ts">
defineProps<{rows:any[];loading?:boolean;total?:number;page?:number;pageSize?:number;rowClassName?:(p:any)=>string}>()
const emit=defineEmits<{page:[number]}>()
</script>
<template><el-table :data="rows" v-loading="loading" stripe :row-class-name="rowClassName"><slot/><el-table-column v-if="$slots.actions" label="Actions" width="190"><template #default="scope"><slot name="actions" :row="scope.row"/></template></el-table-column></el-table><div class="toolbar"><span class="muted">{{ total||0 }} {{ total===1 ? 'record' : 'records' }}</span><el-pagination layout="prev,pager,next" :current-page="(page||0)+1" :page-size="pageSize||10" :total="total||0" @current-change="(p:number)=>emit('page',p-1)"/></div></template>

