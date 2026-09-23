<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PageState from '../components/PageState.vue'
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
const filters = ref({ q: '', linked: '' })
const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'homeAddress', label: 'Home address' },
] as const

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
  if (code === 'VALIDATION') return 'Check required fields'
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
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await customersApi.list({ ...filters.value, page: page.value, size: 10 })
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') forbidden.value = true
    else error.value = 'Could not load customers.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function loadAudit(id: number) {
  audit.value = []
  try {
    const r = await auditApi.list({ entityType: 'CUSTOMER', entityId: id })
    audit.value = r.data.items || []
  } catch {
    audit.value = []
  }
}

/**
 * Occupancy from GET /customers?linked=true (design/13): list linkedVehicle marks taken rows.
 * 14 VehicleResponse has no linkedCustomerId — do not invent that public field.
 * Current drawer already has full linkedVehicles[]; use that for this customer.
 */
async function loadLinkedOwners(): Promise<Map<number, number>> {
  const owners = new Map<number, number>()
  for (const v of selected.value?.linkedVehicles || []) {
    if (selected.value?.id != null && v?.id != null) owners.set(v.id, selected.value.id)
  }
  let page = 0
  let total = 1
  while (page * 50 < total) {
    const r = await customersApi.list({ linked: true, page, size: 50 })
    total = Number(r.data.total) || 0
    const items = r.data.items || []
    for (const c of items) {
      if (c.id === selected.value?.id) continue
      if (c.linkedVehicle?.id != null) owners.set(c.linkedVehicle.id, c.id)
    }
    if (!items.length) break
    page += 1
  }
  return owners
}

async function loadLinkOptions() {
  try {
    const [vehicleRes, owners] = await Promise.all([
      vehiclesApi.list({ status: 'IN_STOCK', page: 0, size: 50 }),
      loadLinkedOwners(),
    ])
    const ownIds = new Set((selected.value?.linkedVehicles || []).map((x: any) => x.id))
    // Drop this customer's already-linked rows; keep other-customer occupancy for disabled options
    vehicles.value = (vehicleRes.data.items || [])
      .filter((x: any) => !ownIds.has(x.id))
      .map((x: any) => ({
        ...x,
        linkedCustomerId: owners.get(x.id) ?? null,
      }))
  } catch {
    vehicles.value = []
  }
}

function isTaken(v: any) {
  return Boolean(v.linkedCustomerId) && v.linkedCustomerId !== selected.value?.id
}

async function openCreate() {
  selected.value = null
  form.value = blankForm()
  formError.value = ''
  linkError.value = ''
  audit.value = []
  vehicles.value = []
  linkId.value = undefined
  drawer.value = true
}

async function openEdit(id: number) {
  formError.value = ''
  linkError.value = ''
  audit.value = []
  try {
    const r = await customersApi.get(id)
    selected.value = r.data
    form.value = {
      name: r.data.name ?? '',
      email: r.data.email ?? '',
      phone: r.data.phone ?? '',
      homeAddress: r.data.homeAddress ?? '',
    }
    drawer.value = true
    await loadLinkOptions()
    await loadAudit(id)
  } catch (e) {
    selected.value = null
    form.value = blankForm()
    drawer.value = false
    ElMessage.error(errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND' ? 'Customer not found' : 'Customer not found')
  }
}

async function save() {
  formError.value = ''
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

async function openDeepLink() {
  const raw = route.query.customerId
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id)) {
    ElMessage.error('Customer not found')
    return
  }
  await openEdit(id)
}

onMounted(async () => {
  await load()
  await openDeepLink()
})
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
    <FormDrawer title="Customer" :visible="drawer" @close="drawer = false">
      <el-form label-position="top">
        <el-form-item v-for="field in CUSTOMER_FIELDS" :key="field.key" :label="field.label">
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
              :label="linkedLabel(v)"
              :value="v.id"
              :disabled="isTaken(v)"
            />
          </el-select>
          <el-button style="margin-top: 10px" @click="link">Link vehicle</el-button>
          <p v-if="linkError" class="danger-text">{{ linkError }}</p>
          <div v-for="v in selected.linkedVehicles || []" :key="v.id" style="margin-top: 12px">
            <span>{{ linkedLabel(v) }}</span>
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
