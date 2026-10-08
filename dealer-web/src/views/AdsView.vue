<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import AdWorkspace from '../components/AdWorkspace.vue'
import PageState from '../components/PageState.vue'
import DataTable from '../components/DataTable.vue'
import { vehiclesApi } from '../api/vehicles'
import {
  applyCheckToListing,
  apiError,
  checkStatusLabel,
  emptyListing,
  listingsApi,
  readyExportMessageAsync,
  saveMessage,
  type CheckStatus,
  type Listing,
} from '../api/listings'

const route = useRoute()
const vehicles = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const selected = ref<any>()
const listing = ref<Listing>(emptyListing())
const summaries = ref<Record<number, { adKind?: string; medium?: string; checkStatus?: CheckStatus | null }>>({})
const listLoading = ref(false)
const listError = ref('')
const listForbidden = ref(false)
const listingLoading = ref(false)
const listingError = ref('')
const listingForbidden = ref(false)
const actionError = ref('')
const saving = ref(false)
const checking = ref(false)
const readyBusy = ref(false)
const exportBusy = ref(false)
let vehicleListSeq = 0
let listingLoadSeq = 0
let loadedListingVehicleId: number | null = null

function contentKey(row: Listing) {
  return JSON.stringify([row.title ?? '', row.body ?? '', row.adKind, row.medium])
}

// Check, Ready and Export act on the saved draft, so unsaved edits must be saved first.
const savedContent = ref(contentKey(listing.value))
const unsaved = computed(() => contentKey(listing.value) !== savedContent.value)

const sold = computed(() => selected.value?.status === 'SOLD')
const canRunCheck = computed(() => !!listing.value.id && !sold.value && !unsaved.value)
const canMarkReady = computed(
  () => !!listing.value.id && listing.value.checkStatus === 'PASSED' && !sold.value && !unsaved.value,
)
const canExport = computed(() => !!listing.value.id && listing.value.checkStatus === 'PASSED' && !unsaved.value)

function rememberSummary(row: Listing) {
  if (!row.vehicleId) return
  summaries.value = {
    ...summaries.value,
    [row.vehicleId]: { adKind: row.adKind, medium: row.medium, checkStatus: row.checkStatus },
  }
}

function kindLabel(kind?: string) {
  if (kind === 'CASH') return 'Cash'
  if (kind === 'FINANCE') return 'Finance'
  if (kind === 'LEASE') return 'Lease'
  return '—'
}

function mediumLabel(medium?: string) {
  if (medium === 'ONLINE') return 'Online'
  if (medium === 'RADIO_TV_BILLBOARD') return 'Radio / TV / Billboard'
  return '—'
}

async function loadVehicles() {
  const request = ++vehicleListSeq
  const requestedPage = page.value
  listLoading.value = true
  listError.value = ''
  listForbidden.value = false
  try {
    const r = await vehiclesApi.list({ page: requestedPage, size: 10 })
    if (request !== vehicleListSeq) return
    vehicles.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (request !== vehicleListSeq) return
    vehicles.value = []
    const { status, code } = apiError(e)
    if (status === 403 || code === 'FORBIDDEN') {
      listForbidden.value = true
    } else {
      listError.value = 'Could not load listing.'
    }
  } finally {
    if (request === vehicleListSeq) listLoading.value = false
  }
}

async function select(vehicle: any) {
  const request = ++listingLoadSeq
  selected.value = vehicle
  listingError.value = ''
  listingForbidden.value = false
  actionError.value = ''
  listingLoading.value = true
  loadedListingVehicleId = null
  listing.value = emptyListing(vehicle.id)
  savedContent.value = contentKey(listing.value)
  try {
    const r = await listingsApi.get(vehicle.id)
    if (request !== listingLoadSeq) return
    listing.value = { ...emptyListing(vehicle.id), ...r.data, vehicleId: vehicle.id }
    savedContent.value = contentKey(listing.value)
    loadedListingVehicleId = vehicle.id
    rememberSummary(listing.value)
  } catch (e) {
    if (request !== listingLoadSeq) return
    const { status, code } = apiError(e)
    if (status === 403 || code === 'FORBIDDEN') listingForbidden.value = true
    else listingError.value = status === 404 || code === 'NOT_FOUND' ? 'Vehicle not found' : 'Could not load listing.'
  } finally {
    if (request === listingLoadSeq) listingLoading.value = false
  }
}

async function openVehicleId(raw: unknown) {
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0) return
  const fromList = vehicles.value.find((v) => v.id === id)
  if (fromList) {
    await select(fromList)
    return
  }
  try {
    const r = await vehiclesApi.get(id)
    await select(r.data)
  } catch {
    listingError.value = 'Vehicle not found'
  }
}

async function refreshListing() {
  if (!selected.value?.id) return
  const request = listingLoadSeq
  const vehicleId = selected.value.id
  const r = await listingsApi.get(vehicleId)
  if (request !== listingLoadSeq || selected.value?.id !== vehicleId) return
  listing.value = { ...emptyListing(vehicleId), ...r.data, vehicleId }
  savedContent.value = contentKey(listing.value)
  loadedListingVehicleId = vehicleId
  rememberSummary(listing.value)
}

async function save() {
  if (!selected.value?.id || sold.value) return
  const vehicleId = selected.value.id
  if (listing.value.vehicleId !== vehicleId || loadedListingVehicleId !== vehicleId) return
  saving.value = true
  actionError.value = ''
  try {
    const r = await listingsApi.save(vehicleId, {
      version: listing.value.version || 0,
      title: listing.value.title ?? '',
      body: listing.value.body ?? '',
      adKind: listing.value.adKind,
      medium: listing.value.medium,
    })
    if (selected.value?.id !== vehicleId) return
    listing.value = { ...emptyListing(vehicleId), ...r.data, vehicleId }
    savedContent.value = contentKey(listing.value)
    loadedListingVehicleId = vehicleId
    rememberSummary(listing.value)
  } catch (e) {
    if (selected.value?.id !== vehicleId) return
    actionError.value = saveMessage(e)
  } finally {
    saving.value = false
  }
}

async function runCheck() {
  if (!listing.value.id || sold.value || !selected.value?.id) return
  const vehicleId = selected.value.id
  if (listing.value.vehicleId !== vehicleId) return
  checking.value = true
  actionError.value = ''
  try {
    const check = (await listingsApi.check(listing.value.id, { version: listing.value.version })).data
    if (selected.value?.id !== vehicleId) return
    try {
      await refreshListing()
    } catch {
      if (selected.value?.id !== vehicleId || listing.value.vehicleId !== vehicleId) return
      listing.value = applyCheckToListing(listing.value, check)
      rememberSummary(listing.value)
    }
  } catch (e) {
    if (selected.value?.id !== vehicleId) return
    const { status, code } = apiError(e)
    if (status === 502 || code === 'AI_UNAVAILABLE') {
      try {
        await refreshListing()
      } catch {
        if (selected.value?.id !== vehicleId || listing.value.vehicleId !== vehicleId) return
        listing.value = { ...listing.value, checkStatus: 'AI_UNAVAILABLE' }
        rememberSummary(listing.value)
      }
    } else if (code === 'VERSION_CONFLICT') {
      actionError.value = 'Refresh and retry'
    } else if (status === 404 || code === 'NOT_FOUND') {
      actionError.value = 'Vehicle not found'
    } else if (status === 403 || code === 'FORBIDDEN') {
      actionError.value = 'You do not have access to Ad compliance.'
    } else {
      actionError.value = 'Could not load listing.'
    }
  } finally {
    checking.value = false
  }
}

async function markReady() {
  if (!listing.value.id || listing.value.checkStatus !== 'PASSED' || !selected.value?.id) return
  const vehicleId = selected.value.id
  if (listing.value.vehicleId !== vehicleId) return
  readyBusy.value = true
  actionError.value = ''
  try {
    const listingId = listing.value.id
    const r = await listingsApi.ready(listingId, { version: listing.value.version })
    if (selected.value?.id !== vehicleId || listing.value.vehicleId !== vehicleId) return
    listing.value = { ...listing.value, ...r.data, id: listingId, vehicleId }
    rememberSummary(listing.value)
  } catch (e) {
    if (selected.value?.id !== vehicleId) return
    actionError.value = await readyExportMessageAsync(e)
  } finally {
    readyBusy.value = false
  }
}

async function exportTxt() {
  if (!listing.value.id || listing.value.checkStatus !== 'PASSED') return
  exportBusy.value = true
  actionError.value = ''
  try {
    const r = await listingsApi.export(listing.value.id, { version: listing.value.version })
    const blob = r.data instanceof Blob ? r.data : new Blob([r.data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dealer-ad.txt'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    actionError.value = await readyExportMessageAsync(e)
  } finally {
    exportBusy.value = false
  }
}

onMounted(loadVehicles)

watch(
  () => route.query.vehicleId,
  (value) => {
    void openVehicleId(value)
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Ad compliance</h1>
          <span class="muted">Check an advertisement before export</span>
        </div>
      </div>
      <AdWorkspace v-model="listing" :vehicle="selected" :read-only="sold">
        <template #picker>
          <el-card>
            <template #header>Vehicles</template>
            <PageState
              :loading="listLoading"
              :error="listError"
              :forbidden="listForbidden"
              :empty="!listLoading && !listError && !listForbidden && !vehicles.length"
              empty-text="No vehicles to advertise."
              loading-text="Loading listing…"
              forbidden-text="You do not have access to Ad compliance."
            >
              <DataTable
                :rows="vehicles"
                :total="total"
                :page="page"
                :row-class-name="({ row }: any) => (row.status === 'SOLD' ? 'sold-row' : '')"
                @page="(p: number) => { page = p; loadVehicles() }"
              >
                <el-table-column label="Vehicle">
                  <template #default="{ row }">{{ row.modelYear }} {{ row.make }} {{ row.model }}</template>
                </el-table-column>
                <el-table-column label="Type">
                  <template #default="{ row }">{{ kindLabel(summaries[row.id]?.adKind) }}</template>
                </el-table-column>
                <el-table-column label="Medium">
                  <template #default="{ row }">{{ mediumLabel(summaries[row.id]?.medium) }}</template>
                </el-table-column>
                <el-table-column label="Check status">
                  <template #default="{ row }">{{ checkStatusLabel(summaries[row.id]?.checkStatus) || '—' }}</template>
                </el-table-column>
                <template #actions="{ row }">
                  <el-button link type="primary" @click="select(row)">Open</el-button>
                </template>
              </DataTable>
            </PageState>
          </el-card>
        </template>
        <template #actions>
          <PageState
            v-if="listingLoading || listingForbidden"
            :loading="listingLoading"
            :forbidden="listingForbidden"
            loading-text="Loading listing…"
            forbidden-text="You do not have access to Ad compliance."
          />
          <p v-else-if="listingError" class="danger-text">{{ listingError }}</p>
          <p v-if="actionError" class="danger-text">{{ actionError }}</p>
          <p v-if="unsaved && listing.id && !sold" class="muted">Save the draft before running a check or exporting.</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
            <el-button :loading="saving" :disabled="!selected || sold" @click="save">Save draft</el-button>
            <el-button :loading="checking" :disabled="!canRunCheck" @click="runCheck">Run check</el-button>
            <el-button :loading="readyBusy" :disabled="!canMarkReady" @click="markReady">Mark ready</el-button>
            <el-button :loading="exportBusy" :disabled="!canExport" @click="exportTxt">Export TXT</el-button>
          </div>
        </template>
      </AdWorkspace>
    </div>
  </AppLayout>
</template>
