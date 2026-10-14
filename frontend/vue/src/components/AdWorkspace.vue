<script setup lang="ts">
import { computed } from 'vue'
import { checkStatusLabel, isCheckStatus, type Listing, type RuleFinding } from '../api/listings'
import { useSessionStore } from '../stores/session'

const props = defineProps<{
  modelValue: Listing
  vehicle?: { modelYear?: number; conditionCode?: string } | null
  readOnly?: boolean
}>()
const session = useSessionStore()
const hasSelection = computed(() => !!props.vehicle)
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

// Each checklist line names the rule codes that can fail it, so a finished check can mark every
// line pass / block / review (UI-43). The list itself stays display only (AD-02).
type ChecklistItem = { label: string; codes: string[] }

const checklist = computed<ChecklistItem[]>(() => {
  const items: ChecklistItem[] = [
    { label: 'Dealership name and contacts', codes: ['DEALER_NAME_MISSING', 'DEALER_CONTACT_MISSING', 'DEALER_CONTACT_INCOMPLETE'] },
    { label: 'Prior use (when applicable)', codes: ['PRIOR_USE_UNCLEAR'] },
    { label: 'New/used and year', codes: ['YEAR_NOT_IN_COPY', 'YEAR_NEW_USED_CONTRADICTION'] },
    { label: 'Extended warranty (if any)', codes: ['WARRANTY_CLAIM_NEEDS_REVIEW'] },
    { label: 'Price', codes: ['PRICE_MISSING'] },
    { label: 'Condition', codes: ['CONDITION_MISMATCH', 'CONDITION_UNDISCLOSED', 'CERTIFIED_NOT_IN_COPY'] },
  ]
  if (listing.value.adKind === 'FINANCE') {
    items.push(
      { label: 'APR', codes: ['FINANCE_APR_MISSING'] },
      { label: 'Term', codes: ['FINANCE_TERM_MISSING'] },
      { label: 'Cash price', codes: ['PRICE_MISSING'] },
    )
    if (listing.value.medium !== 'RADIO_TV_BILLBOARD') {
      items.push({ label: 'Rate shown next to the APR', codes: ['FINANCE_APR_PROXIMITY'] })
    }
  }
  if (listing.value.adKind === 'LEASE') {
    items.push(
      { label: 'Lease statement', codes: ['LEASE_STATEMENT_MISSING'] },
      { label: 'Term', codes: ['LEASE_TERM_MISSING'] },
      { label: 'Rent / payment', codes: ['LEASE_RENT_MISSING'] },
      { label: 'APR', codes: ['LEASE_APR_MISSING'] },
      { label: 'Down payment', codes: ['LEASE_DOWN_MISSING'] },
      {
        label: 'Low-km excess charges (allowance below 20,000 km)',
        codes: ['LEASE_EXCESS_KM_MISSING', 'LEASE_ALLOWANCE_UNSTATED'],
      },
    )
  }
  return items
})

function checklistIcon(item: ChecklistItem) {
  if (!listing.value.lastCheck) return ''
  const failed = findings.value.filter((f) => !f.passed && item.codes.includes(f.ruleId))
  if (failed.some((f) => f.severity === 'BLOCK')) return '❌'
  return failed.length ? '⚠️' : '✅'
}

const formDisabled = computed(() => !hasSelection.value || props.readOnly)

function conditionLabel(code?: string) {
  const s = String(code || '').split('_').join(' ').toLowerCase()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function findingIcon(finding: RuleFinding) {
  if (finding.passed) return '✅'
  return finding.severity === 'BLOCK' ? '❌' : '⚠️'
}
</script>

<template>
  <div class="ad-grid">
    <div style="display:flex;flex-direction:column;gap:16px">
      <slot name="picker" />
      <el-card>
        <template #header>Advertisement</template>
        <p v-if="vehicle" class="muted">
          Year {{ vehicle.modelYear ?? '—' }} · Condition {{ conditionLabel(vehicle.conditionCode) }} · Dealership
          {{ session.dealerLegalName || '—' }}
        </p>
        <p v-if="vehicle" class="muted">
          Contact {{ session.dealerContactPhone || '—' }} · {{ session.dealerContactEmail || '—' }} ·
          {{ session.dealerContactAddress || '—' }}
        </p>
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
      <p>This check is not legal advice and is not an OMVIC approval.</p>
      <div v-if="!hasSelection" class="state">Select a vehicle to start.</div>
      <template v-else>
        <el-tag v-if="isCheckStatus(listing.checkStatus)" :type="statusType" class="status-tag">{{ statusLabel }}</el-tag>
        <h4>Checklist</h4>
        <ul>
          <li v-for="item in checklist" :key="item.label">{{ checklistIcon(item) }} {{ item.label }}</li>
        </ul>
        <p class="muted">Display only. Marks show the last server check; pass or block comes from the server, not this list.</p>
        <h4>Rule findings</h4>
        <ul v-if="findings.length">
          <li v-for="(finding, index) in findings" :key="finding.ruleId + '-' + index">
            {{ findingIcon(finding) }}
            <strong>{{ finding.passed ? 'Pass' : finding.severity === 'BLOCK' ? 'Block' : 'Review' }} · {{ finding.ruleId }}</strong>: {{ finding.message }}
          </li>
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
