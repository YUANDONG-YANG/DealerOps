<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import PageState from '../components/PageState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles'
import { auditApi } from '../api/audit'

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
const sellError = ref('')
const audit = ref<any[]>([])
const filters = ref({ q: '', status: '', condition: '' })
const form = ref(blankForm())
const sellForm = ref({ soldOn: '', soldPrice: '' })

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
  if (code === 'VALIDATION') return 'Check required fields'
  if (code === 'SOLD_LOCKED') return 'Purchase fields are locked'
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (code === 'SOLD_PAIR_REQUIRED') return 'Sold date and price are required together'
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found'
  return 'Could not save vehicle.'
}

const load = async () => {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await vehiclesApi.list({ ...filters.value, page: page.value, size: 10 })
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') forbidden.value = true
    else error.value = 'Could not load vehicles.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function loadAudit(id: number) {
  audit.value = []
  try {
    const r = await auditApi.list({ entityType: 'VEHICLE', entityId: id })
    audit.value = r.data.items || []
  } catch {
    audit.value = []
  }
}

async function fillFromGet(id: number) {
  const r = await vehiclesApi.get(id)
  edit.value = r.data
  form.value = {
    make: r.data.make ?? '',
    model: r.data.model ?? '',
    modelYear: r.data.modelYear ?? '',
    vin: r.data.vin ?? '',
    source: r.data.source ?? 'AUCTION',
    purchaseCost: r.data.purchaseCost ?? '',
    addedOn: r.data.addedOn ?? '',
    conditionCode: r.data.conditionCode ?? 'AS_IS',
    repairCost: r.data.repairCost ?? '',
    carfaxUrl: r.data.carfaxUrl ?? '',
  }
  return r.data
}

async function openCreate() {
  edit.value = null
  form.value = blankForm()
  formError.value = ''
  audit.value = []
  drawer.value = true
}

async function openEdit(id: number) {
  formError.value = ''
  audit.value = []
  try {
    await fillFromGet(id)
    drawer.value = true
    await loadAudit(id)
  } catch (e) {
    edit.value = null
    form.value = blankForm()
    drawer.value = false
    ElMessage.error(errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND' ? 'Vehicle not found' : 'Vehicle not found')
  }
}

async function save() {
  formError.value = ''
  try {
    if (edit.value) {
      const saved = await vehiclesApi.update(edit.value.id, { ...form.value, version: edit.value.version })
      edit.value = saved.data
      form.value = {
        ...form.value,
        make: saved.data.make,
        model: saved.data.model,
        modelYear: saved.data.modelYear,
        vin: saved.data.vin,
        source: saved.data.source,
        purchaseCost: saved.data.purchaseCost,
        addedOn: saved.data.addedOn,
        conditionCode: saved.data.conditionCode,
        repairCost: saved.data.repairCost ?? '',
        carfaxUrl: saved.data.carfaxUrl ?? '',
      }
      await loadAudit(saved.data.id)
    } else {
      await vehiclesApi.create(form.value)
      drawer.value = false
    }
    await load()
  } catch (e) {
    formError.value = mapWrite(e)
  }
}

async function openSell(id: number) {
  sellError.value = ''
  sellForm.value = { soldOn: '', soldPrice: '' }
  try {
    await fillFromGet(id)
    sellOpen.value = true
  } catch {
    ElMessage.error('Vehicle not found')
  }
}

async function sell() {
  sellError.value = ''
  const soldOn = String(sellForm.value.soldOn || '').trim()
  const price = Number(sellForm.value.soldPrice)
  if (!soldOn || sellForm.value.soldPrice === '' || !Number.isFinite(price) || price <= 0) {
    sellError.value = 'Sold date and price are required together'
    return
  }
  try {
    await vehiclesApi.sell(edit.value.id, {
      soldOn,
      soldPrice: price,
      version: edit.value.version,
    })
    sellOpen.value = false
    drawer.value = false
    await load()
  } catch (e) {
    sellError.value = mapWrite(e)
  }
}

async function openDeepLink() {
  const raw = route.query.vehicleId
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id)) {
    ElMessage.error('Vehicle not found')
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
          <el-table-column prop="purchaseCost" label="Cost" />
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
      <el-form label-position="top">
        <el-form-item v-for="field in PURCHASE_FIELDS" :key="field.key" :label="field.label">
          <el-input v-model="form[field.key]" :disabled="edit?.status === 'SOLD'" />
        </el-form-item>
        <el-form-item label="Source">
          <el-select v-model="form.source" :disabled="edit?.status === 'SOLD'">
            <el-option v-for="v in SOURCES" :key="v" :label="enumLabel(v)" :value="v" />
          </el-select>
        </el-form-item>
        <el-form-item label="Condition">
          <el-select v-model="form.conditionCode" :disabled="edit?.status === 'SOLD'">
            <el-option v-for="v in CONDITIONS" :key="v" :label="enumLabel(v)" :value="v" />
          </el-select>
        </el-form-item>
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-button type="primary" @click="save">Save</el-button>
        <div v-if="edit?.id" class="detail-audit">
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
