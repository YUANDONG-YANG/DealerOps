<script setup lang="ts">
defineProps<{ rows: any[] }>()

// Audit summaries never show customer contact details (design/14-Backend-API-Contract.md §5 audit).
function summaryText(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '—'
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) }
  for (const k of Object.keys(o)) {
    if (/email|phone|address/i.test(k)) delete o[k]
  }
  return Object.keys(o).length ? JSON.stringify(o) : '—'
}
</script>

<template>
  <div class="detail-audit">
    <div class="muted">Audit</div>
    <el-table :data="rows">
      <el-table-column prop="action" label="Action" width="110" />
      <el-table-column prop="actorUsername" label="Actor" />
      <el-table-column prop="createdAt" label="When" />
      <el-table-column label="Summary">
        <template #default="{ row }">{{ summaryText(row.fieldSummary) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>
