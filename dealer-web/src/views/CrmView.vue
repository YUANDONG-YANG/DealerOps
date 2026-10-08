<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PageState from '../components/PageState.vue'
import { fieldErrorsOf, messageOf } from '../api/http'
import { customersApi } from '../api/customers'
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles'
import { auditApi } from '../api/audit'
import { leadsApi, stageLabel } from '../api/leads'

const route = useRoute()
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const drawer = ref(false)
const confirm = ref(false)
const selected = ref<any>(null)
const vehicles = ref<any[]>([])
const audit = ref<any[]>([])
const customerLeads = ref<any[]>([])
const formError = ref('')
// CRM-13: a shared email is allowed (families share one), so this only warns.
const emailWarning = ref('')
const serverErrors = ref<Record<string, string>>({})
const saving = ref(false)
const linkError = ref('')
const unlinkId = ref<number | null>(null)
const linkId = ref<number | undefined>()
const form = ref(blankForm())
const formRef = ref<FormInstance>()
const filters = ref({ q: '', linked: '' })
let listSeq = 0
let editSeq = 0
const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'homeAddress', label: 'Home address' },
] as const

// Mirrors the backend CustomerFieldRules (requirements/analysis/03-CRM-Customers.md field table).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/
const PHONE_PATTERN = /^(?=(?:\D*\d){7,20}\D*$)[0-9+\-() ]+$/

function requiredFieldRule(max: number, check?: (value: string) => string | undefined) {
  return {
    required: true,
    trigger: 'blur' as const,
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      const text = typeof value === 'string' ? value.trim() : ''
      if (!text) return callback(new Error('Check required fields'))
      if (text.length > max) return callback(new Error(`At most ${max} characters`))
      const message = check?.(text)
      return message ? callback(new Error(message)) : callback()
    },
  }
}

const customerRules: FormRules = {
  name: [requiredFieldRule(100)],
  email: [requiredFieldRule(254, (v) => (EMAIL_PATTERN.test(v) ? undefined : 'Enter a valid email'))],
  phone: [
    requiredFieldRule(40, (v) =>
      PHONE_PATTERN.test(v) ? undefined : 'Use 7 to 20 digits; only + - ( ) and spaces are allowed',
    ),
  ],
  homeAddress: [requiredFieldRule(300)],
}

function blankForm() {
  return { name: '', email: '', phone: '', homeAddress: '' }
}

function linkedLabel(v: any) {
  if (!v) return '—'
  return `${v.modelYear} ${v.make} ${v.model}`
}

function summaryText(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '—'
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) }
  for (const k of Object.keys(o)) {
    if (/email|phone|address/i.test(k)) delete o[k]
  }
  return Object.keys(o).length ? JSON.stringify(o) : '—'
}

function mapCustomerWrite(e: unknown) {
  const code = errorCode(e)
  const status = errorStatus(e)
  if (code === 'VALIDATION') {
    serverErrors.value = fieldErrorsOf(e)
    return messageOf(e, 'Check required fields')
  }
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (status === 404 || code === 'NOT_FOUND') return 'Customer not found'
  return 'Could not save customer.'
}

function mapLink(e: unknown) {
  const code = errorCode(e)
  const status = errorStatus(e)
  if (code === 'VEHICLE_ALREADY_LINKED') return 'Vehicle already linked'
  if (code === 'WRONG_DEALER_OR_SOLD') return 'Vehicle not available'
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found'
  return 'Could not link vehicle.'
}

function mapUnlink(e: unknown) {
  const code = errorCode(e)
  const status = errorStatus(e)
  if (code === 'SOLD_LOCKED') return 'Sold vehicles cannot be unlinked'
  if (status === 404 || code === 'NOT_FOUND') return 'Link not found'
  return 'Could not unlink vehicle.'
}

const load = async () => {
  const seq = ++listSeq
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await customersApi.list({ ...filters.value, page: page.value, size: 10 })
    if (seq !== listSeq) return
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (seq !== listSeq) return
    if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') forbidden.value = true
    else error.value = 'Could not load customers.'
    rows.value = []
  } finally {
    if (seq === listSeq) loading.value = false
  }
}

async function loadAudit(id: number, seq: number) {
  if (seq !== editSeq) return
  audit.value = []
  try {
    const r = await auditApi.list({ entityType: 'CUSTOMER', entityId: id })
    if (seq !== editSeq) return
    audit.value = r.data.items || []
  } catch {
    if (seq !== editSeq) return
    audit.value = []
  }
}

// Latest leads for this customer (design/21-Feature-Extensions.md §3); the full list lives on /leads.
async function loadCustomerLeads(id: number, seq: number) {
  customerLeads.value = []
  try {
    const r = await leadsApi.list({ customerId: id, size: 10 })
    if (seq === editSeq) customerLeads.value = r.data.items || []
  } catch {
    if (seq === editSeq) customerLeads.value = []
  }
}

async function collectPages(
  loadPage: (page: number, size: number) => Promise<{ data: { items?: any[]; total?: number; size?: number } }>,
): Promise<any[]> {
  const collected: any[] = []
  let pageIndex = 0
  let totalCount = Number.POSITIVE_INFINITY
  let size = 10
  while (collected.length < totalCount) {
    const r = await loadPage(pageIndex, size)
    const pageItems = r.data.items || []
    totalCount = Number(r.data.total) || 0
    const returned = Number(r.data.size)
    if (Number.isFinite(returned) && returned > 0) size = Math.min(returned, 10)
    collected.push(...pageItems)
    if (!pageItems.length) break
    pageIndex += 1
  }
  return collected
}

async function loadLinkOptions(seq: number) {
  try {
    const allVehicles = await collectPages((pageIndex, size) => vehiclesApi.list({ page: pageIndex, size }))
    if (seq !== editSeq) return
    // VehicleResponse.linkedCustomer marks occupancy; offer only unlinked vehicles, in stock or sold.
    vehicles.value = allVehicles.filter((x: any) => !x.linkedCustomer)
  } catch {
    if (seq !== editSeq) return
    vehicles.value = []
  }
}

function closeDrawer() {
  if (!drawer.value) return
  editSeq += 1
  drawer.value = false
}

async function openCreate() {
  editSeq += 1
  selected.value = null
  form.value = blankForm()
  formError.value = ''
  emailWarning.value = ''
  serverErrors.value = {}
  linkError.value = ''
  audit.value = []
  vehicles.value = []
  linkId.value = undefined
  drawer.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function openEdit(id: number) {
  const seq = ++editSeq
  formError.value = ''
  emailWarning.value = ''
  serverErrors.value = {}
  linkError.value = ''
  audit.value = []
  try {
    const r = await customersApi.get(id)
    if (seq !== editSeq) return
    selected.value = r.data
    form.value = {
      name: r.data.name ?? '',
      email: r.data.email ?? '',
      phone: r.data.phone ?? '',
      homeAddress: r.data.homeAddress ?? '',
    }
    drawer.value = true
    await nextTick()
    if (seq !== editSeq) return
    formRef.value?.clearValidate()
    await loadLinkOptions(seq)
    await loadCustomerLeads(id, seq)
    await loadAudit(id, seq)
  } catch (e) {
    if (seq !== editSeq) return
    selected.value = null
    form.value = blankForm()
    drawer.value = false
    const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND'
    ElMessage.error(missing ? 'Customer not found' : 'Could not load customer.')
  }
}

async function checkSharedEmail() {
  const email = String(form.value.email || '').trim().toLowerCase()
  emailWarning.value = ''
  if (!EMAIL_PATTERN.test(email)) return
  try {
    const r = await customersApi.list({ q: email })
    const shared = (r.data.items || []).some(
      (c: { id: number; email?: string }) => c.email?.toLowerCase() === email && c.id !== selected.value?.id,
    )
    if (shared && String(form.value.email || '').trim().toLowerCase() === email) {
      emailWarning.value = 'Another customer at this dealership already uses this email. You can still save.'
    }
  } catch {
    // The warning is advisory; a failed lookup must not block or interrupt editing.
  }
}

async function save() {
  formError.value = ''
  serverErrors.value = {}
  if (!formRef.value) return
  const ok = await formRef.value.validate().then((passed) => passed !== false).catch(() => false)
  if (!ok || saving.value) return
  saving.value = true
  await checkSharedEmail()
  try {
    if (selected.value) {
      const saved = await customersApi.update(selected.value.id, { ...form.value, version: selected.value.version })
      selected.value = { ...selected.value, ...saved.data }
      await load()
      await openEdit(selected.value.id)
    } else {
      await customersApi.create(form.value)
      drawer.value = false
      await load()
    }
  } catch (e) {
    formError.value = mapCustomerWrite(e)
  } finally {
    saving.value = false
  }
}

async function link() {
  if (linkId.value === undefined || !selected.value) return
  linkError.value = ''
  try {
    await customersApi.link(selected.value.id, linkId.value)
    linkId.value = undefined
    await load()
    await openEdit(selected.value.id)
  } catch (e) {
    linkError.value = mapLink(e)
  }
}

function requestUnlink(vehicleId: number) {
  unlinkId.value = vehicleId
  confirm.value = true
}

function cancelUnlink() {
  confirm.value = false
  unlinkId.value = null
}

async function unlink() {
  const vehicleId = unlinkId.value
  const customerId = selected.value?.id
  confirm.value = false
  unlinkId.value = null
  if (vehicleId == null || !customerId) return
  linkError.value = ''
  try {
    await customersApi.unlink(customerId, vehicleId)
    await load()
    await openEdit(customerId)
  } catch (e) {
    linkError.value = mapUnlink(e)
  }
}

async function openDeepLink(raw: unknown = route.query.customerId) {
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id)) {
    ElMessage.error('Customer not found')
    return
  }
  await openEdit(id)
}

onMounted(() => {
  void load()
})

watch(
  () => route.query.customerId,
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
          <h1>CRM</h1>
          <span class="muted">Customers and linked vehicles</span>
        </div>
        <el-button type="primary" @click="openCreate">Add customer</el-button>
      </div>
      <div class="filters">
        <el-input v-model="filters.q" placeholder="Name / Email / Phone" />
        <el-select v-model="filters.linked" placeholder="Linked" clearable>
          <el-option label="Linked" value="true" />
          <el-option label="Not linked" value="false" />
        </el-select>
        <el-button @click="page = 0; load()">Search</el-button>
        <el-button @click="filters = { q: '', linked: '' }; page = 0; load()">Reset</el-button>
      </div>
      <PageState
        :loading="loading"
        :error="error"
        :forbidden="forbidden"
        :empty="!loading && !error && !forbidden && !rows.length"
        empty-text="No customers match."
        loading-text="Loading customers…"
        forbidden-text="You do not have access to CRM."
      >
        <DataTable :rows="rows" :total="total" :page="page" @page="(p: number) => { page = p; load() }">
          <el-table-column prop="name" label="Name" />
          <el-table-column prop="email" label="Email" />
          <el-table-column prop="phone" label="Phone" />
          <el-table-column label="Linked vehicle">
            <template #default="{ row }">{{ linkedLabel(row.linkedVehicle) }}</template>
          </el-table-column>
          <el-table-column prop="linkedVehicleCount" label="Vehicles purchased" width="160" />
          <template #actions="{ row }">
            <el-button link type="primary" @click="openEdit(row.id)">Edit</el-button>
          </template>
        </DataTable>
      </PageState>
    </div>
    <FormDrawer title="Customer" :visible="drawer" @close="closeDrawer">
      <el-form ref="formRef" :model="form" :rules="customerRules" label-position="top">
        <el-form-item
          v-for="field in CUSTOMER_FIELDS"
          :key="field.key"
          :label="field.label"
          :prop="field.key"
          :error="serverErrors[field.key]"
        >
          <el-input v-model="form[field.key]" @blur="field.key === 'email' && checkSharedEmail()" />
        </el-form-item>
        <p v-if="emailWarning" class="warning-text">{{ emailWarning }}</p>
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-button type="primary" :loading="saving" @click="save">Save</el-button>
        <template v-if="selected">
          <el-divider />
          <el-select v-model="linkId" filterable placeholder="Link vehicle" style="width: 100%">
            <el-option
              v-for="v in vehicles"
              :key="v.id"
              :label="`${linkedLabel(v)} · ${v.vin}`"
              :value="v.id"
            />
          </el-select>
          <el-button style="margin-top: 10px" @click="link">Link vehicle</el-button>
          <p v-if="linkError" class="danger-text">{{ linkError }}</p>
          <div v-for="v in selected.linkedVehicles || []" :key="v.id" style="margin-top: 12px">
            <router-link :to="{ path: '/dms', query: { vehicleId: v.id } }">{{ linkedLabel(v) }}</router-link>
            <span class="muted"> · {{ v.vin }} · {{ v.status === 'SOLD' ? 'Sold' : 'In stock' }}</span>
            <el-button v-if="v.status !== 'SOLD'" link type="danger" @click="requestUnlink(v.id)">Unlink</el-button>
            <span v-else class="muted"> Sold vehicles cannot be unlinked</span>
          </div>
          <el-divider />
          <div class="muted">Leads</div>
          <p v-if="!customerLeads.length" class="muted">No leads for this customer.</p>
          <div v-for="l in customerLeads" :key="l.id" style="margin-top: 8px">
            <router-link :to="{ path: '/leads', query: { leadId: l.id } }">
              {{ stageLabel(l.stage) }} · {{ l.vehicle ? linkedLabel(l.vehicle) : 'No vehicle' }}
            </router-link>
            <span class="muted"> · Follow-up {{ l.nextFollowUpOn || '—' }}</span>
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
      </el-form>
    </FormDrawer>
    <ConfirmDialog
      :visible="confirm"
      title="Unlink vehicle"
      message="Remove this vehicle link?"
      @cancel="cancelUnlink"
      @confirm="unlink"
    />
  </AppLayout>
</template>
