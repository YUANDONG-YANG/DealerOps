<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PageState from '../components/PageState.vue'
import { adminApi, adminErrorCode, adminErrorStatus, type Dealer, type Member } from '../api/admin'

type FlatMember = Member & { dealerId: number; legalName: string }

const tab = ref<'dealers' | 'members'>('dealers')
const rows = ref<Dealer[]>([])
const total = ref(0)
const page = ref(0)
const q = ref('')
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const memberQ = ref('')
const flatMembers = ref<FlatMember[]>([])
const memberPage = ref(0)
const membersLoading = ref(false)
const membersError = ref('')
const membersForbidden = ref(false)

const drawer = ref(false)
const form = ref({ legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' })
const formError = ref('')

const staffDealer = ref<Dealer | null>(null)
const memberDrawer = ref(false)
const drawerMembers = ref<Member[]>([])
const drawerError = ref('')
const member = ref({ entraOid: '', displayName: '' })
const bindError = ref('')

const confirm = ref(false)
const pendingUnbind = ref<{ dealerId: number; entraOid: string } | null>(null)
const unbindError = ref('')

const pagedMembers = computed(() =>
  flatMembers.value.slice(memberPage.value * 10, memberPage.value * 10 + 10),
)

function isForbidden(e: unknown) {
  return adminErrorCode(e) === 'FORBIDDEN' || adminErrorStatus(e) === 403
}

function loadErrorMessage(e: unknown) {
  if (isForbidden(e)) return 'You do not have access to Admin.'
  return 'Could not load dealerships.'
}

async function loadDealers() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await adminApi.dealers({ q: q.value, page: page.value, size: 10 })
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    rows.value = []
    total.value = 0
    forbidden.value = isForbidden(e)
    error.value = forbidden.value ? '' : loadErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function fetchAllDealers() {
  const all: Dealer[] = []
  let p = 0
  let n = 0
  do {
    const r = await adminApi.dealers({ page: p, size: 10 })
    all.push(...(r.data.items || []))
    n = r.data.total || 0
    p += 1
  } while (all.length < n)
  return all
}

async function fetchDealerMembers(dealerId: number, filterQ: string) {
  const items: Member[] = []
  let p = 0
  let n = 0
  do {
    const r = await adminApi.members(dealerId, { q: filterQ, page: p, size: 10 })
    items.push(...(r.data.items || []))
    n = r.data.total || 0
    p += 1
  } while (items.length < n)
  return items
}

async function loadFlatMembers() {
  membersLoading.value = true
  membersError.value = ''
  membersForbidden.value = false
  try {
    const dealers = await fetchAllDealers()
    const flat: FlatMember[] = []
    for (const d of dealers) {
      const items = await fetchDealerMembers(d.id, memberQ.value)
      for (const m of items) {
        flat.push({ ...m, dealerId: d.id, legalName: d.legalName })
      }
    }
    flatMembers.value = flat
    if (memberPage.value * 10 >= flat.length) memberPage.value = 0
  } catch (e) {
    flatMembers.value = []
    membersForbidden.value = isForbidden(e)
    if (membersForbidden.value) {
      membersError.value = ''
    } else if (adminErrorCode(e) === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      membersError.value = 'Dealership not found'
    } else {
      membersError.value = loadErrorMessage(e)
    }
  } finally {
    membersLoading.value = false
  }
}

async function openMembers(row: Dealer) {
  staffDealer.value = row
  memberDrawer.value = true
  bindError.value = ''
  drawerError.value = ''
  try {
    drawerMembers.value = await fetchDealerMembers(row.id, '')
  } catch (e) {
    drawerMembers.value = []
    if (adminErrorCode(e) === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      drawerError.value = 'Dealership not found'
    } else if (isForbidden(e)) {
      drawerError.value = 'You do not have access to Admin.'
    } else {
      drawerError.value = 'Could not load dealerships.'
    }
  }
}

async function refreshDrawerMembers() {
  if (!staffDealer.value) return
  drawerMembers.value = await fetchDealerMembers(staffDealer.value.id, '')
}

async function create() {
  formError.value = ''
  const body = form.value
  if (!body.legalName || !body.contactPhone || !body.contactEmail || !body.contactAddress) {
    formError.value = 'Check required contact fields'
    return
  }
  try {
    await adminApi.createDealer(body)
    drawer.value = false
    form.value = { legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' }
    tab.value = 'dealers'
    page.value = 0
    await loadDealers()
  } catch (e) {
    if (adminErrorCode(e) === 'VALIDATION' || adminErrorStatus(e) === 400) {
      formError.value = 'Check required contact fields'
    } else if (isForbidden(e)) {
      formError.value = 'You do not have access to Admin.'
    } else {
      formError.value = 'Check required contact fields'
    }
  }
}

async function bind() {
  bindError.value = ''
  if (!staffDealer.value) return
  try {
    await adminApi.bind(staffDealer.value.id, member.value)
    member.value = { entraOid: '', displayName: '' }
    await refreshDrawerMembers()
    await loadDealers()
    if (tab.value === 'members') await loadFlatMembers()
  } catch (e) {
    const code = adminErrorCode(e)
    if (code === 'DUP_MEMBER' || adminErrorStatus(e) === 409) {
      bindError.value = 'Staff already bound'
    } else if (code === 'VALIDATION' || adminErrorStatus(e) === 400) {
      bindError.value = 'Check Entra ID'
    } else if (code === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      bindError.value = 'Dealership not found'
    } else if (isForbidden(e)) {
      bindError.value = 'You do not have access to Admin.'
    } else {
      bindError.value = 'Check Entra ID'
    }
  }
}

function askUnbind(dealerId: number, entraOid: string) {
  pendingUnbind.value = { dealerId, entraOid }
  unbindError.value = ''
  confirm.value = true
}

async function unbind() {
  if (!pendingUnbind.value) return
  const { dealerId, entraOid } = pendingUnbind.value
  try {
    await adminApi.unbind(dealerId, entraOid)
    confirm.value = false
    pendingUnbind.value = null
    if (staffDealer.value?.id === dealerId) await refreshDrawerMembers()
    await loadDealers()
    if (tab.value === 'members') await loadFlatMembers()
  } catch (e) {
    if (adminErrorCode(e) === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      unbindError.value = 'Member not found'
    } else if (isForbidden(e)) {
      unbindError.value = 'You do not have access to Admin.'
    } else {
      unbindError.value = 'Member not found'
    }
  }
}

function staffCount(row: Dealer) {
  return row.staffCount == null ? '—' : row.staffCount
}

function onTab(name: string | number) {
  if (name === 'members' && !flatMembers.value.length && !membersLoading.value) {
    loadFlatMembers()
  }
}

onMounted(loadDealers)
</script>

<template>
  <AppLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Admin</h1>
          <span class="muted">Dealerships and members</span>
        </div>
        <el-button type="primary" @click="drawer = true; formError = ''">New dealership</el-button>
      </div>
      <el-tabs v-model="tab" @tab-change="onTab">
        <el-tab-pane label="Dealerships" name="dealers">
          <div class="filters">
            <el-input v-model="q" placeholder="Dealership name" clearable />
            <el-button @click="page = 0; loadDealers()">Search</el-button>
            <el-button @click="q = ''; page = 0; loadDealers()">Reset</el-button>
          </div>
          <PageState
            :loading="loading"
            :error="error"
            :forbidden="forbidden"
            :empty="!loading && !error && !forbidden && !rows.length"
            empty-text="No dealerships yet."
            loading-text="Loading dealerships…"
            forbidden-text="You do not have access to Admin."
          >
            <DataTable :rows="rows" :total="total" :page="page" @page="p => { page = p; loadDealers() }">
              <el-table-column prop="legalName" label="Name" />
              <el-table-column label="Contact">
                <template #default="{ row }">{{ row.contactPhone }} / {{ row.contactEmail }}</template>
              </el-table-column>
              <el-table-column label="Staff count">
                <template #default="{ row }">{{ staffCount(row) }}</template>
              </el-table-column>
              <template #actions="{ row }">
                <el-button link @click="openMembers(row)">Staff</el-button>
              </template>
            </DataTable>
          </PageState>
        </el-tab-pane>
        <el-tab-pane label="Members" name="members">
          <div class="filters">
            <el-input v-model="memberQ" placeholder="Staff email" clearable />
            <el-button @click="memberPage = 0; loadFlatMembers()">Search</el-button>
            <el-button @click="memberQ = ''; memberPage = 0; loadFlatMembers()">Reset</el-button>
          </div>
          <PageState
            :loading="membersLoading"
            :error="membersError"
            :forbidden="membersForbidden"
            :empty="!membersLoading && !membersError && !membersForbidden && !flatMembers.length"
            empty-text="No dealerships yet."
            loading-text="Loading dealerships…"
            forbidden-text="You do not have access to Admin."
          >
            <DataTable
              :rows="pagedMembers"
              :total="flatMembers.length"
              :page="memberPage"
              @page="p => { memberPage = p }"
            >
              <el-table-column label="Entra ID / email">
                <template #default="{ row }">{{ row.entraOid }}</template>
              </el-table-column>
              <el-table-column prop="legalName" label="Dealership" />
              <el-table-column label="Status">
                <template #default="{ row }">
                  <el-tag>{{ row.active ? 'Active' : 'Inactive' }}</el-tag>
                </template>
              </el-table-column>
              <template #actions="{ row }">
                <el-button
                  v-if="row.active"
                  link
                  @click="askUnbind(row.dealerId, row.entraOid)"
                >Unbind</el-button>
              </template>
            </DataTable>
          </PageState>
        </el-tab-pane>
      </el-tabs>
    </div>
    <FormDrawer title="New dealership" :visible="drawer" @close="drawer = false">
      <el-form label-position="top">
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-form-item label="Legal name">
          <el-input v-model="form.legalName" />
        </el-form-item>
        <el-form-item label="Contact phone">
          <el-input v-model="form.contactPhone" />
        </el-form-item>
        <el-form-item label="Contact email">
          <el-input v-model="form.contactEmail" />
        </el-form-item>
        <el-form-item label="Contact address">
          <el-input v-model="form.contactAddress" />
        </el-form-item>
        <el-button type="primary" @click="create">Create</el-button>
      </el-form>
    </FormDrawer>
    <FormDrawer :title="staffDealer ? `Staff · ${staffDealer.legalName}` : 'Staff'" :visible="memberDrawer" @close="memberDrawer = false">
      <el-form label-position="top">
        <p v-if="drawerError" class="danger-text">{{ drawerError }}</p>
        <p v-if="bindError" class="danger-text">{{ bindError }}</p>
        <el-form-item label="Entra OID">
          <el-input v-model="member.entraOid" />
        </el-form-item>
        <el-form-item label="Display name">
          <el-input v-model="member.displayName" />
        </el-form-item>
        <el-button type="primary" @click="bind">Bind staff</el-button>
      </el-form>
      <el-table :data="drawerMembers" style="margin-top:20px">
        <el-table-column prop="entraOid" label="Entra ID" />
        <el-table-column prop="displayName" label="Name" />
        <el-table-column label="Status">
          <template #default="{ row }">
            <el-tag>{{ row.active ? 'Active' : 'Inactive' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions">
          <template #default="{ row }">
            <el-button
              v-if="staffDealer && row.active"
              link
              @click="askUnbind(staffDealer.id, row.entraOid)"
            >Unbind</el-button>
          </template>
        </el-table-column>
      </el-table>
    </FormDrawer>
    <ConfirmDialog
      :visible="confirm"
      title="Unbind staff"
      :message="unbindError || 'Remove this staff membership?'"
      @cancel="confirm = false; pendingUnbind = null"
      @confirm="unbind"
    />
  </AppLayout>
</template>
