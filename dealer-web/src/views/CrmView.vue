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
import { messageOf } from '../api/http'
import { customersApi } from '../api/customers'
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles'
import { auditApi } from '../api/audit'

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
const formError = ref('')
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

function requiredFieldRule() {
  return {
    required: true,
    trigger: 'blur' as const,
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      if (typeof value !== 'string' || value.trim() === '') callback(new Error('Check required fields'))
      else callback()
    },
  }
}

const customerRules: FormRules = {
  name: [requiredFieldRule()],
  email: [requiredFieldRule()],
  phone: [requiredFieldRule()],
  homeAddress: [requiredFieldRule()],
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

function validationMessage(error: unknown) {
  const fieldErrors = (
    error as { response?: { data?: { fieldErrors?: Record<string, unknown> | null } } }
  ).response?.data?.fieldErrors
  if (fieldErrors && typeof fieldErrors === 'object') {
    const parts = Object.entries(fieldErrors)
      .map(([field, detail]) => (typeof detail === 'string' && detail.trim() ? `${field}: ${detail.trim()}` : ''))
      .filter((part) => part.length > 0)
    if (parts.length) return parts.join('; ')
  }
  return messageOf(error, 'Check required fields')
}

function mapCustomerWrite(e: unknown) {
  const code = errorCode(e)
  const status = errorStatus(e)
  if (code === 'VALIDATION') return validationMessage(e)
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

/**
 * Occupancy comes from full customer details; the list contains only the latest vehicle.
 * 14 VehicleResponse has no linkedCustomerId — do not invent that public field.
 * Current drawer already has full linkedVehicles[]; use that for this customer.
 */
async function loadLinkedOwners(customer: any): Promise<Map<number, number>> {
  const owners = new Map<number, number>()
  const customerId = customer?.id
  for (const v of customer?.linkedVehicles || []) {
    if (customerId != null && v?.id != null) owners.set(v.id, customerId)
  }
  const items = await collectPages((pageIndex, size) => customersApi.list({ linked: true, page: pageIndex, size }))
  for (const c of items) {
    if (c.id === customerId) continue
    const detail = (await customersApi.get(c.id)).data
    for (const v of detail.linkedVehicles || []) {
      if (v?.id != null) owners.set(v.id, c.id)
    }
  }
  return owners
}

async function loadLinkOptions(seq: number, customer: any) {
  try {
    const [allVehicles, owners] = await Promise.all([
      collectPages((pageIndex, size) => vehiclesApi.list({ page: pageIndex, size })),
      loadLinkedOwners(customer),
    ])
    if (seq !== editSeq) return
    const ownIds = new Set((customer?.linkedVehicles || []).map((x: any) => x.id))
    // Only offer unlinked vehicles, including same-dealer sold vehicles.
    vehicles.value = allVehicles
      .filter((x: any) => !ownIds.has(x.id) && !owners.has(x.id))
      .map((x: any) => ({
        ...x,
        linkedCustomerId: owners.get(x.id) ?? null,
      }))
  } catch {
    if (seq !== editSeq) return
    vehicles.value = []
  }
}

function isTaken(v: any) {
  return Boolean(v.linkedCustomerId) && v.linkedCustomerId !== selected.value?.id
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
    await loadLinkOptions(seq, r.data)
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

async function save() {
  formError.value = ''
  if (!formRef.value) return
  const ok = await formRef.value.validate().then((passed) => passed !== false).catch(() => false)
  if (!ok) return
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
          <template #actions="{ row }">
            <el-button link @click="openEdit(row.id)">Edit</el-button>
          </template>
        </DataTable>
      </PageState>
    </div>
    <FormDrawer title="Customer" :visible="drawer" @close="closeDrawer">
      <el-form ref="formRef" :model="form" :rules="customerRules" label-position="top">
        <el-form-item v-for="field in CUSTOMER_FIELDS" :key="field.key" :label="field.label" :prop="field.key">
          <el-input v-model="form[field.key]" />
        </el-form-item>
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-button type="primary" @click="save">Save</el-button>
        <template v-if="selected">
          <el-divider />
          <el-select v-model="linkId" filterable placeholder="Link vehicle" style="width: 100%">
            <el-option
              v-for="v in vehicles"
              :key="v.id"
              :label="`${linkedLabel(v)} · ${v.vin}`"
              :value="v.id"
              :disabled="isTaken(v)"
            />
          </el-select>
          <el-button style="margin-top: 10px" @click="link">Link vehicle</el-button>
          <p v-if="linkError" class="danger-text">{{ linkError }}</p>
          <div v-for="v in selected.linkedVehicles || []" :key="v.id" style="margin-top: 12px">
            <router-link :to="{ path: '/dms', query: { vehicleId: v.id } }">{{ linkedLabel(v) }}</router-link>
            <span class="muted"> · {{ v.vin }} · {{ v.status === 'SOLD' ? 'Sold' : 'In stock' }}</span>
            <el-button v-if="v.status !== 'SOLD'" link @click="requestUnlink(v.id)">Unlink</el-button>
            <span v-else class="muted"> Sold vehicles cannot be unlinked</span>
          </div>
          <div class="detail-audit">
            <div class="muted">Audit</div>
            <el-table :data="audit">
              <el-table-column prop="action" label="Action" width="110" />
              <el-table-column prop="actorOid" label="Actor" />
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
