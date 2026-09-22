<script setup lang="ts">
import { computed } from 'vue'
import { checkStatusLabel, isCheckStatus, type Listing } from '../api/listings'

const props = defineProps<{
  modelValue: Listing
  hasSelection?: boolean
  readOnly?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [Listing] }>()

const listing = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const statusLabel = computed(() => checkStatusLabel(listing.value.checkStatus))
const statusType = computed(() => {
  const s = listing.value.checkStatus
  if (s === 'PASSED') return 'success'
  if (s === 'BLOCKED') return 'danger'
  if (s === 'NEEDS_AI') return 'info'
  return 'warning'
})

const findings = computed(() => listing.value.lastCheck?.ruleFindings || [])
const aiNotes = computed(() => listing.value.lastCheck?.aiNotes || [])

const checklist = computed(() => {
  const items = [
    'Dealership name and contacts',
    'Prior use (when applicable)',
    'New/used and year',
    'Extended warranty (if any)',
    'Price',
    'Condition',
  ]
  if (listing.value.adKind === 'FINANCE') {
    items.push('APR', 'Term', 'Cash price')
    if (listing.value.medium !== 'RADIO_TV_BILLBOARD') {
      items.push('Rate shown next to the APR')
    }
  }
  if (listing.value.adKind === 'LEASE') {
    items.push('Lease statement', 'Term', 'Rent / payment', 'APR', 'Down payment')
    items.push('Low-km excess charges (allowance below 20,000 km)')
  }
  return items
})

const formDisabled = computed(() => !props.hasSelection || props.readOnly)
</script>

<template>
  <div class="ad-grid">
    <div style="display:flex;flex-direction:column;gap:16px">
      <slot name="picker" />
      <el-card>
        <template #header>Advertisement</template>
        <el-form label-position="top" :disabled="formDisabled">
          <el-form-item label="Title">
            <el-input v-model="listing.title" />
          </el-form-item>
          <el-form-item label="Body">
            <el-input v-model="listing.body" type="textarea" :rows="10" />
          </el-form-item>
          <el-form-item label="Type">
            <el-select v-model="listing.adKind" style="width:100%">
              <el-option label="Cash" value="CASH" />
              <el-option label="Finance" value="FINANCE" />
              <el-option label="Lease" value="LEASE" />
            </el-select>
          </el-form-item>
          <el-form-item label="Medium">
            <el-select v-model="listing.medium" style="width:100%">
              <el-option label="Online" value="ONLINE" />
              <el-option label="Radio / TV / Billboard" value="RADIO_TV_BILLBOARD" />
            </el-select>
          </el-form-item>
        </el-form>
        <p v-if="readOnly" class="muted">This vehicle is sold. The advertisement is read-only.</p>
        <slot name="actions" />
      </el-card>
    </div>
    <el-card class="result-pane">
      <template #header>Check result</template>
      <div v-if="!hasSelection" class="state">Select a vehicle to start.</div>
      <template v-else>
        <el-tag v-if="isCheckStatus(listing.checkStatus)" :type="statusType" class="status-tag">{{ statusLabel }}</el-tag>
        <h4>Checklist</h4>
        <ul>
          <li v-for="item in checklist" :key="item">{{ item }}</li>
        </ul>
        <p class="muted">Display only. Pass or block comes from the server check, not this list.</p>
        <h4>Rule findings</h4>
        <ul v-if="findings.length">
          <li v-for="(finding, index) in findings" :key="finding.ruleId + '-' + index">{{ finding.message }}</li>
        </ul>
        <p v-else class="muted">No rule findings yet. Save a draft and run check.</p>
        <template v-if="aiNotes.length">
          <h4>AI notes</h4>
          <ul>
            <li v-for="(note, index) in aiNotes" :key="'note-' + index">{{ note.message }}</li>
          </ul>
        </template>
      </template>
    </el-card>
  </div>
</template>
