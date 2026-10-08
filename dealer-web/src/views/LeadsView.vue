<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import PageState from '../components/PageState.vue'
import { fieldErrorsOf, messageOf } from '../api/http'
import { customersApi } from '../api/customers'
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles'
import { auditApi } from '../api/audit'
import { LEAD_STAGES, isClosedStage, leadsApi, stageLabel, type LeadStage } from '../api/leads'
import { memberLabel, membersApi, type MemberOption } from '../api/members'

const route = useRoute()
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const filters = ref({ q: '', stage: '', owner: '', overdue: false })
const owners = ref<MemberOption[]>([])
let listSeq = 0
let detailSeq = 0

// Create drawer
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createFieldErrors = ref<Record<string, string>>({})
const createFormRef = ref<FormInstance>()
const customerMode = ref<'existing' | 'new'>('existing')
const createForm = ref(blankCreate())
const customerOptions = ref<any[]>([])
const vehicleOptions = ref<any[]>([])

// Detail drawer
const detailOpen = ref(false)
const selected = ref<any>(null)
const edit = ref(blankEdit())
const saving = ref(false)
const editError = ref('')
const noteText = ref('')
const noteError = ref('')
const addingNote = ref(false)
const audit = ref<any[]>([])

function blankCreate() {
  return {
    customerId: undefined as number | undefined,
    name: '',
    email: '',
    phone: '',
    homeAddress: '',
    vehicleId: undefined as number | undefined,
    ownerUsername: '',
    nextFollowUpOn: '',
    note: '',
  }
}

function blankEdit() {
  return {
    stage: 'NEW' as LeadStage,
    ownerUsername: '',
    nextFollowUpOn: '',
    vehicleId: undefined as number | undefined,
    lostReason: '',
  }
}

function vehicleLabel(v: any) {
  if (!v) return '—'
  return `${v.modelYear} ${v.make} ${v.model}`
}

function summaryText(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '—'
  return Object.keys(raw as Record<string, unknown>).length ? JSON.stringify(raw) : '—'
}

function mapWrite(e: unknown, fallback: string) {
  const code = errorCode(e)
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields')
  if (code === 'WRONG_DEALER_OR_SOLD') return 'Vehicle must be in stock at this dealership'
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (code === 'LEAD_CLOSED') return 'Won and lost leads cannot be changed'
  if (errorStatus(e) === 404 || code === 'NOT_FOUND') return 'Lead not found'
  return fallback
}

async function load() {
  const seq = ++listSeq
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await leadsApi.list({ ...filters.value, page: page.value, size: 10 })
    if (seq !== listSeq) return
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (seq !== listSeq) return
    if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') forbidden.value = true
    else error.value = 'Could not load leads.'
    rows.value = []
  } finally {
    if (seq === listSeq) loading.value = false
  }
}

function search() {
  page.value = 0
  void load()
}

function resetFilters() {
  filters.value = { q: '', stage: '', owner: '', overdue: false }
  search()
}

async function loadOwners() {
  try {
    owners.value = (await membersApi.list()).data || []
  } catch {
    owners.value = []
  }
}

async function searchCustomers(q: string) {
  try {
    customerOptions.value = (await customersApi.list({ q, size: 10 })).data.items || []
  } catch {
    customerOptions.value = []
  }
}

async function searchVehicles(q: string) {
  try {
    vehicleOptions.value = (await vehiclesApi.list({ q, status: 'IN_STOCK', size: 10 })).data.items || []
  } catch {
    vehicleOptions.value = []
  }
}

async function openCreate() {
  createForm.value = blankCreate()
  customerMode.value = 'existing'
  createError.value = ''
  createFieldErrors.value = {}
  createOpen.value = true
  void searchCustomers('')
  void searchVehicles('')
  await nextTick()
  createFormRef.value?.clearValidate()
}

async function create() {
  createError.value = ''
  createFieldErrors.value = {}
  const f = createForm.value
  if (customerMode.value === 'existing' && f.customerId == null) {
    createError.value = 'Choose a customer'
    return
  }
  if (customerMode.value === 'new' && ![f.name, f.email, f.phone, f.homeAddress].every((v) => v.trim())) {
    createError.value = 'Check required fields'
    return
  }
  if (creating.value) return
  creating.value = true
  try {
    await leadsApi.create({
      customerId: customerMode.value === 'existing' ? f.customerId : undefined,
      newCustomer:
        customerMode.value === 'new'
          ? { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), homeAddress: f.homeAddress.trim() }
          : undefined,
      vehicleId: f.vehicleId,
      ownerUsername: f.ownerUsername,
      nextFollowUpOn: f.nextFollowUpOn,
      note: f.note,
    })
    createOpen.value = false
    await load()
  } catch (e) {
    createFieldErrors.value = fieldErrorsOf(e)
    createError.value = mapWrite(e, 'Could not save lead.')
  } finally {
    creating.value = false
  }
}

async function loadAudit(id: number, seq: number) {
  try {
    const r = await auditApi.list({ entityType: 'LEAD', entityId: id })
    if (seq === detailSeq) audit.value = r.data.items || []
  } catch {
    if (seq === detailSeq) audit.value = []
  }
}

function fillEdit(lead: any) {
  selected.value = lead
  edit.value = {
    stage: lead.stage,
    ownerUsername: lead.ownerUsername ?? '',
    nextFollowUpOn: lead.nextFollowUpOn ?? '',
    vehicleId: lead.vehicle?.id,
    lostReason: lead.lostReason ?? '',
  }
  // The current vehicle may be sold now; keep it selectable so an unchanged save still works.
  vehicleOptions.value = lead.vehicle ? [lead.vehicle] : []
}

async function openDetail(id: number) {
  const seq = ++detailSeq
  editError.value = ''
  noteError.value = ''
  noteText.value = ''
  audit.value = []
  try {
    const r = await leadsApi.get(id)
    if (seq !== detailSeq) return
    fillEdit(r.data)
    detailOpen.value = true
    await loadAudit(id, seq)
  } catch (e) {
    if (seq !== detailSeq) return
    detailOpen.value = false
    const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND'
    ElMessage.error(missing ? 'Lead not found' : 'Could not load lead.')
  }
}

function closeDetail() {
  if (!detailOpen.value) return
  detailSeq += 1
  detailOpen.value = false
}

async function saveDetail() {
  if (!selected.value || saving.value) return
  editError.value = ''
  const e = edit.value
  if (e.stage === 'LOST' && !e.lostReason.trim()) {
    editError.value = 'A lost lead needs a reason'
    return
  }
  saving.value = true
  try {
    const r = await leadsApi.update(selected.value.id, {
      stage: e.stage,
      ownerUsername: e.ownerUsername || null,
      nextFollowUpOn: e.nextFollowUpOn || null,
      vehicleId: e.vehicleId ?? null,
      lostReason: e.stage === 'LOST' ? e.lostReason.trim() : null,
      version: selected.value.version,
    })
    fillEdit(r.data)
    await load()
    await loadAudit(r.data.id, detailSeq)
  } catch (err) {
    editError.value = mapWrite(err, 'Could not save lead.')
  } finally {
    saving.value = false
  }
}

async function addNote() {
  const text = noteText.value.trim()
  if (!selected.value || !text || addingNote.value) return
  noteError.value = ''
  addingNote.value = true
  try {
    const r = await leadsApi.addNote(selected.value.id, text)
    selected.value = { ...selected.value, notes: [r.data, ...(selected.value.notes || [])] }
    noteText.value = ''
    await loadAudit(selected.value.id, detailSeq)
  } catch (e) {
    noteError.value = mapWrite(e, 'Could not add note.')
  } finally {
    addingNote.value = false
  }
}

async function openDeepLink(raw: unknown) {
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id)) {
    ElMessage.error('Lead not found')
    return
  }
  await openDetail(id)
}

onMounted(() => {
  void load()
  void loadOwners()
})

watch(
  () => route.query.leadId,
  (value) => {
    void openDeepLink(value)
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Leads</h1>
          <span class="muted">Sales opportunities and follow-ups</span>
        </div>
        <el-button type="primary" @click="openCreate">Add lead</el-button>
      </div>
      <div class="filters">
        <el-input v-model="filters.q" placeholder="Customer name" @keyup.enter="search" />
        <el-select v-model="filters.stage" placeholder="Stage" clearable>
          <el-option v-for="s in LEAD_STAGES" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-select v-model="filters.owner" placeholder="Owner" clearable filterable>
          <el-option v-for="o in owners" :key="o.username" :label="memberLabel(o)" :value="o.username" />
        </el-select>
        <el-checkbox v-model="filters.overdue">Overdue only</el-checkbox>
        <el-button @click="search">Search</el-button>
        <el-button @click="resetFilters">Reset</el-button>
      </div>
      <PageState
        :loading="loading"
        :error="error"
        :forbidden="forbidden"
        :empty="!loading && !error && !forbidden && !rows.length"
        empty-text="No leads match."
        loading-text="Loading leads…"
        forbidden-text="You do not have access to leads."
      >
        <DataTable :rows="rows" :total="total" :page="page" @page="(p: number) => { page = p; load() }">
          <el-table-column prop="customerName" label="Customer" />
          <el-table-column label="Vehicle of interest">
            <template #default="{ row }">{{ vehicleLabel(row.vehicle) }}</template>
          </el-table-column>
          <el-table-column label="Stage" width="120">
            <template #default="{ row }">
              <el-tag :type="row.stage === 'WON' ? 'success' : row.stage === 'LOST' ? 'info' : undefined">
                {{ stageLabel(row.stage) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Owner" width="140">
            <template #default="{ row }">{{ row.ownerUsername || '—' }}</template>
          </el-table-column>
          <el-table-column label="Next follow-up" width="150">
            <template #default="{ row }">
              <span :class="{ 'danger-text': row.overdue }">{{ row.nextFollowUpOn || '—' }}</span>
              <span v-if="row.overdue" class="danger-text"> · Overdue</span>
            </template>
          </el-table-column>
          <template #actions="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">Open</el-button>
          </template>
        </DataTable>
      </PageState>
    </div>

    <FormDrawer title="Add lead" :visible="createOpen" @close="createOpen = false">
      <el-form ref="createFormRef" :model="createForm" label-position="top">
        <el-radio-group v-model="customerMode" class="lead-mode">
          <el-radio-button value="existing">Existing customer</el-radio-button>
          <el-radio-button value="new">New customer</el-radio-button>
        </el-radio-group>
        <el-form-item v-if="customerMode === 'existing'" label="Customer" required>
          <el-select
            v-model="createForm.customerId"
            filterable
            remote
            :remote-method="searchCustomers"
            placeholder="Search by name, email or phone"
            style="width: 100%"
          >
            <el-option v-for="c in customerOptions" :key="c.id" :label="`${c.name} · ${c.email}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <template v-else>
          <el-form-item label="Name" required :error="createFieldErrors['newCustomer.name']">
            <el-input v-model="createForm.name" />
          </el-form-item>
          <el-form-item label="Email" required :error="createFieldErrors['newCustomer.email']">
            <el-input v-model="createForm.email" />
          </el-form-item>
          <el-form-item label="Phone" required :error="createFieldErrors['newCustomer.phone']">
            <el-input v-model="createForm.phone" />
          </el-form-item>
          <el-form-item label="Home address" required :error="createFieldErrors['newCustomer.homeAddress']">
            <el-input v-model="createForm.homeAddress" />
          </el-form-item>
        </template>
        <el-form-item label="Vehicle of interest (in stock)">
          <el-select
            v-model="createForm.vehicleId"
            filterable
            remote
            clearable
            :remote-method="searchVehicles"
            placeholder="Search by VIN, make or model"
            style="width: 100%"
          >
            <el-option v-for="v in vehicleOptions" :key="v.id" :label="`${vehicleLabel(v)} · ${v.vin}`" :value="v.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Owner">
          <el-select v-model="createForm.ownerUsername" clearable filterable placeholder="Unassigned" style="width: 100%">
            <el-option v-for="o in owners" :key="o.username" :label="memberLabel(o)" :value="o.username" />
          </el-select>
        </el-form-item>
        <el-form-item label="Next follow-up">
          <el-input v-model="createForm.nextFollowUpOn" type="date" />
        </el-form-item>
        <el-form-item label="First note">
          <el-input v-model="createForm.note" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </el-form-item>
        <p v-if="createError" class="danger-text">{{ createError }}</p>
        <el-button type="primary" :loading="creating" @click="create">Save</el-button>
      </el-form>
    </FormDrawer>

    <FormDrawer title="Lead" :visible="detailOpen" @close="closeDetail">
      <template v-if="selected">
        <p>
          <router-link :to="{ path: '/crm', query: { customerId: selected.customerId } }">
            {{ selected.customerName }}
          </router-link>
          <span v-if="selected.vehicle" class="muted">
            · <router-link :to="{ path: '/dms', query: { vehicleId: selected.vehicle.id } }">
              {{ vehicleLabel(selected.vehicle) }}
            </router-link>
          </span>
        </p>
        <el-form label-position="top">
          <el-form-item label="Stage">
            <el-select v-model="edit.stage" :disabled="isClosedStage(selected.stage)" style="width: 100%">
              <el-option v-for="s in LEAD_STAGES" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="edit.stage === 'LOST'" label="Lost reason" required>
            <el-input v-model="edit.lostReason" :disabled="isClosedStage(selected.stage)" maxlength="300" />
          </el-form-item>
          <el-form-item label="Owner">
            <el-select
              v-model="edit.ownerUsername"
              clearable
              filterable
              placeholder="Unassigned"
              :disabled="isClosedStage(selected.stage)"
              style="width: 100%"
            >
              <el-option v-for="o in owners" :key="o.username" :label="memberLabel(o)" :value="o.username" />
            </el-select>
          </el-form-item>
          <el-form-item label="Next follow-up">
            <el-input v-model="edit.nextFollowUpOn" type="date" :disabled="isClosedStage(selected.stage)" />
          </el-form-item>
          <el-form-item label="Vehicle of interest (in stock)">
            <el-select
              v-model="edit.vehicleId"
              filterable
              remote
              clearable
              :remote-method="searchVehicles"
              :disabled="isClosedStage(selected.stage)"
              placeholder="Search by VIN, make or model"
              style="width: 100%"
            >
              <el-option v-for="v in vehicleOptions" :key="v.id" :label="`${vehicleLabel(v)} · ${v.vin}`" :value="v.id" />
            </el-select>
          </el-form-item>
          <p v-if="isClosedStage(selected.stage)" class="muted">This lead is closed. You can still add notes.</p>
          <p v-if="editError" class="danger-text">{{ editError }}</p>
          <el-button v-if="!isClosedStage(selected.stage)" type="primary" :loading="saving" @click="saveDetail">
            Save
          </el-button>
        </el-form>

        <el-divider />
        <div class="muted">Notes</div>
        <el-input v-model="noteText" type="textarea" :rows="3" maxlength="2000" placeholder="Add a follow-up note" />
        <el-button class="lead-note-add" :loading="addingNote" :disabled="!noteText.trim()" @click="addNote">
          Add note
        </el-button>
        <p v-if="noteError" class="danger-text">{{ noteError }}</p>
        <p v-if="!(selected.notes || []).length" class="muted">No notes yet.</p>
        <div v-for="n in selected.notes || []" :key="n.id" class="lead-note">
          <div class="muted">{{ n.authorUsername }} · {{ n.createdAt }}</div>
          <div class="lead-note-body">{{ n.body }}</div>
        </div>

        <div class="detail-audit">
          <div class="muted">Audit</div>
          <el-table :data="audit">
            <el-table-column prop="action" label="Action" width="110" />
            <el-table-column prop="actorUsername" label="Actor" />
            <el-table-column prop="createdAt" label="When" />
            <el-table-column label="Summary">
              <template #default="{ row }">{{ summaryText(row.fieldSummary) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </FormDrawer>
  </AppLayout>
</template>

<style scoped>
.lead-mode {
  margin-bottom: 16px;
}
.lead-note-add {
  margin-top: 8px;
}
.lead-note {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.lead-note-body {
  white-space: pre-wrap;
  margin-top: 4px;
}
</style>
