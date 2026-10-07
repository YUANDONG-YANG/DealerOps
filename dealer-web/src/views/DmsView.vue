<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import PageState from '../components/PageState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { fieldErrorsOf, messageOf } from '../api/http'
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles'
import { auditApi } from '../api/audit'
import { checkStatusLabel, listingsApi } from '../api/listings'

const SOURCES = ['TRADE_IN', 'AUCTION', 'PRIVATE_PURCHASE', 'OTHER']
const CONDITIONS = ['CERTIFIED', 'AS_IS', 'UNFIT', 'IRREPARABLE']
const PURCHASE_FIELDS = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'modelYear', label: 'Model year' },
  { key: 'vin', label: 'VIN' },
  { key: 'purchaseCost', label: 'Purchase cost' },
  { key: 'addedOn', label: 'Added on' },
  { key: 'repairCost', label: 'Repair cost' },
  { key: 'carfaxUrl', label: 'Carfax URL' },
] as const

const route = useRoute()
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const drawer = ref(false)
const sellOpen = ref(false)
const edit = ref<any>(null)
const formError = ref('')
const saving = ref(false)
const sellError = ref('')
const audit = ref<any[]>([])
const adStatus = ref('')
const serverErrors = ref<Record<string, string>>({})
const filters = ref({ q: '', status: '', condition: '' })
const form = ref(blankForm())
const sellForm = ref({ soldOn: '', soldPrice: '' })
const vehicleFormRef = ref<{
  validate: () => Promise<unknown>
  clearValidate: () => void
} | null>(null)
let listRequest = 0
let detailRequest = 0

type FieldCheck = (value: string) => string | undefined

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/
const URL_PATTERN = /^https?:\/\/\S+$/i
const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function cad(value: unknown) {
  return value == null || value === '' ? '—' : CAD.format(Number(value))
}

// DMS-16: derived on the detail only, never stored.
function profit(v: { soldPrice?: unknown; purchaseCost?: unknown; repairCost?: unknown }) {
  if (v.soldPrice == null || v.soldPrice === '' || v.purchaseCost == null || v.purchaseCost === '') return null
  return Number(v.soldPrice) - Number(v.purchaseCost) - Number(v.repairCost || 0)
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const anyValue: FieldCheck = () => undefined

const textCheck: FieldCheck = (v) => (v.length <= 50 ? undefined : 'At most 50 characters')

const urlCheck: FieldCheck = (v) =>
  v.length <= 500 && URL_PATTERN.test(v) ? undefined : 'Must be an http(s) URL of at most 500 characters'

const vinCheck: FieldCheck = (v) =>
  VIN_PATTERN.test(v.toUpperCase()) ? undefined : 'VIN must be 17 letters or digits, without I, O or Q'

const yearCheck: FieldCheck = (v) => {
  const year = Number(v)
  const max = new Date().getFullYear() + 1
  return Number.isInteger(year) && year >= 1900 && year <= max ? undefined : `Year must be 1900 to ${max}`
}

const moneyCheck: FieldCheck = (v) =>
  MONEY_PATTERN.test(v) ? undefined : 'Must be an amount of 0 or more with at most 2 decimals'

const pastDateCheck: FieldCheck = (v) => {
  if (!DATE_PATTERN.test(v) || Number.isNaN(Date.parse(v))) return 'Use the format YYYY-MM-DD'
  return v > todayIso() ? 'Date cannot be in the future' : undefined
}

function fieldRule(check: FieldCheck, required = true, trigger: 'blur' | 'change' = 'blur') {
  return [
    {
      required,
      trigger,
      validator: (_rule: unknown, raw: unknown, callback: (error?: Error) => void) => {
        const value = raw == null ? '' : String(raw).trim()
        if (!value) return required ? callback(new Error('Required')) : callback()
        const message = check(value)
        return message ? callback(new Error(message)) : callback()
      },
    },
  ]
}

const conditionRules = { conditionCode: fieldRule(anyValue, true, 'change') }

const purchaseRules = {
  make: fieldRule(textCheck),
  model: fieldRule(textCheck),
  modelYear: fieldRule(yearCheck),
  vin: fieldRule(vinCheck),
  purchaseCost: fieldRule(moneyCheck),
  addedOn: fieldRule(pastDateCheck),
  repairCost: fieldRule(moneyCheck, false),
  carfaxUrl: fieldRule(urlCheck, false),
  source: fieldRule(anyValue, true, 'change'),
  ...conditionRules,
}

// Sold vehicles keep purchase fields read-only, so only the editable condition is validated.
const formRules = computed(() => (edit.value?.status === 'SOLD' ? conditionRules : purchaseRules))

function blankForm() {
  return {
    make: '',
    model: '',
    modelYear: '',
    vin: '',
    source: 'AUCTION',
    purchaseCost: '',
    addedOn: '',
    conditionCode: 'AS_IS',
    repairCost: '',
    carfaxUrl: '',
  }
}

function enumLabel(v: string) {
  const s = String(v || '').split('_').join(' ').toLowerCase()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function summaryText(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '—'
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) }
  for (const k of Object.keys(o)) {
    if (/email|phone|address/i.test(k)) delete o[k]
  }
  return Object.keys(o).length ? JSON.stringify(o) : '—'
}

function mapWrite(e: unknown) {
  const code = errorCode(e)
  const status = errorStatus(e)
  if (code === 'VIN_DUP') return 'VIN already in this dealership'
  if (code === 'VALIDATION') {
    serverErrors.value = fieldErrorsOf(e)
    return messageOf(e, 'Check required fields')
  }
  if (code === 'SOLD_LOCKED') return 'Purchase fields are locked'
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (code === 'SOLD_PAIR_REQUIRED') return 'Sold date and price are required together'
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found'
  return 'Could not save vehicle.'
}

const load = async () => {
  const seq = ++listRequest
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await vehiclesApi.list({ ...filters.value, page: page.value, size: 10 })
    if (seq !== listRequest) return
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (seq !== listRequest) return
    if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') forbidden.value = true
    else error.value = 'Could not load vehicles.'
    rows.value = []
  } finally {
    if (seq === listRequest) loading.value = false
  }
}

async function loadAdStatus(id: number, seq: number) {
  adStatus.value = ''
  try {
    const r = await listingsApi.get(id)
    if (seq !== detailRequest) return
    adStatus.value = checkStatusLabel(r.data.checkStatus) || 'Not checked'
  } catch {
    if (seq !== detailRequest) return
    adStatus.value = 'Could not load ad check status.'
  }
}

async function loadAudit(id: number, seq = detailRequest) {
  if (seq !== detailRequest) return
  audit.value = []
  try {
    const r = await auditApi.list({ entityType: 'VEHICLE', entityId: id })
    if (seq !== detailRequest) return
    audit.value = r.data.items || []
  } catch {
    if (seq !== detailRequest) return
    audit.value = []
  }
}

function vehicleForm(data: any) {
  return {
    make: data.make ?? '',
    model: data.model ?? '',
    modelYear: data.modelYear ?? '',
    vin: data.vin ?? '',
    source: data.source ?? 'AUCTION',
    purchaseCost: data.purchaseCost ?? '',
    addedOn: data.addedOn ?? '',
    conditionCode: data.conditionCode ?? 'AS_IS',
    repairCost: data.repairCost ?? '',
    carfaxUrl: data.carfaxUrl ?? '',
  }
}

async function openCreate() {
  detailRequest += 1
  edit.value = null
  form.value = blankForm()
  formError.value = ''
  serverErrors.value = {}
  audit.value = []
  drawer.value = true
  await nextTick()
  vehicleFormRef.value?.clearValidate()
}

async function openEdit(id: number) {
  const seq = ++detailRequest
  formError.value = ''
  serverErrors.value = {}
  audit.value = []
  try {
    const r = await vehiclesApi.get(id)
    if (seq !== detailRequest) return
    edit.value = r.data
    form.value = vehicleForm(r.data)
    drawer.value = true
    await nextTick()
    if (seq !== detailRequest) return
    vehicleFormRef.value?.clearValidate()
    await Promise.all([loadAdStatus(id, seq), loadAudit(id)])
  } catch (e) {
    if (seq !== detailRequest) return
    edit.value = null
    form.value = blankForm()
    drawer.value = false
    const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND'
    ElMessage.error(missing ? 'Vehicle not found' : 'Could not load vehicle.')
  }
}

async function save() {
  formError.value = ''
  serverErrors.value = {}
  const seq = detailRequest
  if (vehicleFormRef.value) {
    const ok = await vehicleFormRef.value.validate().then(() => true).catch(() => false)
    if (!ok) return
  }
  if (seq !== detailRequest) return
  const current = edit.value
  // Sold VINs are locked; only normalize the VIN while it is still editable.
  const payload =
    current?.status === 'SOLD' ? { ...form.value } : { ...form.value, vin: String(form.value.vin).trim().toUpperCase() }
  if (saving.value) return
  saving.value = true
  try {
    if (current) {
      const saved = await vehiclesApi.update(current.id, { ...payload, version: current.version })
      if (seq !== detailRequest) {
        await load()
        return
      }
      edit.value = saved.data
      form.value = vehicleForm(saved.data)
      await Promise.all([loadAdStatus(saved.data.id, seq), loadAudit(saved.data.id, seq)])
    } else {
      await vehiclesApi.create(payload)
      if (seq !== detailRequest) {
        await load()
        return
      }
      drawer.value = false
    }
    await load()
  } catch (e) {
    if (seq !== detailRequest) return
    formError.value = mapWrite(e)
  } finally {
    saving.value = false
  }
}

async function openSell(id: number) {
  const seq = ++detailRequest
  sellError.value = ''
  sellForm.value = { soldOn: '', soldPrice: '' }
  try {
    const r = await vehiclesApi.get(id)
    if (seq !== detailRequest) return
    edit.value = r.data
    form.value = vehicleForm(r.data)
    sellOpen.value = true
  } catch (e) {
    if (seq !== detailRequest) return
    const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND'
    ElMessage.error(missing ? 'Vehicle not found' : 'Could not open sale.')
  }
}

async function sell() {
  sellError.value = ''
  const soldOn = String(sellForm.value.soldOn || '').trim()
  const priceText = String(sellForm.value.soldPrice).trim()
  const price = Number(priceText)
  if (!soldOn || !priceText) {
    sellError.value = 'Sold date and price are required together'
    return
  }
  if (!MONEY_PATTERN.test(priceText) || price <= 0) {
    sellError.value = 'Sold price must be more than 0 with at most 2 decimals'
    return
  }
  const dateProblem = pastDateCheck(soldOn)
  if (dateProblem || soldOn < String(edit.value.addedOn || '')) {
    sellError.value = dateProblem || 'Sold date cannot be before the date added'
    return
  }
  const seq = detailRequest
  const id = edit.value.id
  const version = edit.value.version
  try {
    await vehiclesApi.sell(id, {
      soldOn,
      soldPrice: price,
      version,
    })
    if (seq === detailRequest) {
      sellOpen.value = false
      drawer.value = false
    }
    await load()
  } catch (e) {
    if (seq !== detailRequest) return
    sellError.value = mapWrite(e)
  }
}

function openDeepLink(raw: unknown) {
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id)) {
    ElMessage.error('Vehicle not found')
    return
  }
  void openEdit(id)
}

onMounted(() => {
  void load()
})

watch(
  () => route.query.vehicleId,
  (value) => {
    openDeepLink(value)
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>DMS</h1>
          <span class="muted">Vehicle inventory</span>
        </div>
        <el-button type="primary" @click="openCreate">Add vehicle</el-button>
      </div>
      <div class="filters">
        <el-input v-model="filters.q" placeholder="VIN / Make / Model" />
        <el-select v-model="filters.status" placeholder="Status" clearable>
          <el-option label="In stock" value="IN_STOCK" />
          <el-option label="Sold" value="SOLD" />
        </el-select>
        <el-select v-model="filters.condition" placeholder="Condition" clearable>
          <el-option v-for="v in CONDITIONS" :key="v" :label="enumLabel(v)" :value="v" />
        </el-select>
        <el-button @click="page = 0; load()">Search</el-button>
        <el-button @click="filters = { q: '', status: '', condition: '' }; page = 0; load()">Reset</el-button>
      </div>
      <PageState
        :loading="loading"
        :error="error"
        :forbidden="forbidden"
        :empty="!loading && !error && !forbidden && !rows.length"
        empty-text="No vehicles match."
        loading-text="Loading vehicles…"
        forbidden-text="You do not have access to DMS."
      >
        <DataTable
          :rows="rows"
          :total="total"
          :page="page"
          :row-class-name="({ row }: any) => (row.status === 'SOLD' ? 'sold-row' : '')"
          @page="(p: number) => { page = p; load() }"
        >
          <el-table-column label="Year Make Model">
            <template #default="{ row }">{{ row.modelYear }} {{ row.make }} {{ row.model }}</template>
          </el-table-column>
          <el-table-column prop="vin" label="VIN" />
          <el-table-column label="Source">
            <template #default="{ row }">{{ enumLabel(row.source) }}</template>
          </el-table-column>
          <el-table-column label="Condition">
            <template #default="{ row }">{{ enumLabel(row.conditionCode) }}</template>
          </el-table-column>
          <el-table-column label="Cost">
            <template #default="{ row }">{{ cad(row.purchaseCost) }}</template>
          </el-table-column>
          <el-table-column prop="addedOn" label="Date added" />
          <el-table-column label="Status">
            <template #default="{ row }">
              <el-tag>{{ enumLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <template #actions="{ row }">
            <el-button link @click="openEdit(row.id)">Edit</el-button>
            <el-button v-if="row.status !== 'SOLD'" link @click="openSell(row.id)">Sell</el-button>
          </template>
        </DataTable>
      </PageState>
    </div>
    <FormDrawer :title="edit ? 'Edit vehicle' : 'Add vehicle'" :visible="drawer" @close="drawer = false">
      <el-form ref="vehicleFormRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item
          v-for="field in PURCHASE_FIELDS"
          :key="field.key"
          :label="field.label"
          :prop="field.key"
          :error="serverErrors[field.key]"
        >
          <el-input v-model="form[field.key]" :disabled="edit?.status === 'SOLD'" />
        </el-form-item>
        <el-form-item label="Source" prop="source" :error="serverErrors.source">
          <el-select v-model="form.source" :disabled="edit?.status === 'SOLD'">
            <el-option v-for="v in SOURCES" :key="v" :label="enumLabel(v)" :value="v" />
          </el-select>
        </el-form-item>
        <el-form-item label="Condition" prop="conditionCode" :error="serverErrors.conditionCode">
          <el-select v-model="form.conditionCode">
            <el-option v-for="v in CONDITIONS" :key="v" :label="enumLabel(v)" :value="v" />
          </el-select>
        </el-form-item>
        <template v-if="edit?.status === 'SOLD'">
          <el-form-item label="Sold date"><span>{{ edit.soldOn }}</span></el-form-item>
          <el-form-item label="Sold price"><span>{{ cad(edit.soldPrice) }}</span></el-form-item>
          <el-form-item label="Profit (sold price − purchase cost − repair cost)">
            <span :class="{ 'danger-text': (profit(edit) ?? 0) < 0 }">{{ cad(profit(edit)) }}</span>
          </el-form-item>
        </template>
        <el-form-item v-if="edit?.id" label="Linked customer">
          <router-link v-if="edit.linkedCustomer" :to="{ path: '/crm', query: { customerId: edit.linkedCustomer.id } }">
            {{ edit.linkedCustomer.name }}
          </router-link>
          <span v-else>—</span>
        </el-form-item>
        <el-form-item v-if="edit?.id" label="Ad check status"><span>{{ adStatus || '—' }}</span></el-form-item>
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-button type="primary" :loading="saving" @click="save">Save</el-button>
        <div v-if="edit?.id" class="detail-audit">
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
      </el-form>
    </FormDrawer>
    <ConfirmDialog
      :visible="sellOpen"
      title="Sell vehicle"
      confirm-label="Confirm sale"
      @cancel="sellOpen = false"
      @confirm="sell"
    >
      <el-form label-position="top">
        <el-form-item label="Sold date">
          <el-input v-model="sellForm.soldOn" type="date" />
        </el-form-item>
        <el-form-item label="Sold price">
          <el-input v-model="sellForm.soldPrice" />
        </el-form-item>
        <p v-if="sellError" class="danger-text">{{ sellError }}</p>
      </el-form>
    </ConfirmDialog>
  </AppLayout>
</template>
