<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
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
const dealerFormRef = ref<FormInstance>()
const form = ref({ legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' })
const formError = ref('')
const dealerRules: FormRules = {
  legalName: [{ required: true, message: 'Legal name is required', trigger: 'blur' }],
  contactPhone: [{ required: true, message: 'Contact phone is required', trigger: 'blur' }],
  contactEmail: [{ required: true, message: 'Contact email is required', trigger: 'blur' }],
  contactAddress: [{ required: true, message: 'Contact address is required', trigger: 'blur' }],
}

const staffDealer = ref<Dealer | null>(null)
const memberDrawer = ref(false)
const memberFormRef = ref<FormInstance>()
const drawerMembers = ref<Member[]>([])
const drawerError = ref('')
const member = ref({ entraOid: '', displayName: '', password: '' })
const bindError = ref('')
const memberRules: FormRules = {
  entraOid: [{ required: true, message: 'Username is required', trigger: 'blur' }],
  displayName: [{ required: true, message: 'Display name is required', trigger: 'blur' }],
  password: [
    { required: true, message: 'Temporary password is required', trigger: 'blur' },
    { min: 8, message: 'At least 8 characters', trigger: 'blur' },
  ],
}

let dealersLoadSeq = 0
let membersLoadSeq = 0
let drawerMembersLoadSeq = 0

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

function serverDetail(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { message?: unknown; fieldErrors?: unknown } } })
    .response?.data
  if (!data || typeof data !== 'object') return undefined
  const parts: string[] = []
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (message) parts.push(message)
  const fields = data.fieldErrors
  if (fields && typeof fields === 'object') {
    for (const [field, text] of Object.entries(fields)) {
      if (typeof text === 'string' && text.trim()) parts.push(`${field}: ${text.trim()}`)
    }
  }
  return parts.length ? parts.join(' ') : undefined
}

async function loadDealers() {
  const seq = ++dealersLoadSeq
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const r = await adminApi.dealers({ q: q.value, page: page.value, size: 10 })
    if (seq !== dealersLoadSeq) return
    rows.value = r.data.items || []
    total.value = r.data.total || 0
  } catch (e) {
    if (seq !== dealersLoadSeq) return
    rows.value = []
    total.value = 0
    forbidden.value = isForbidden(e)
    error.value = forbidden.value ? '' : loadErrorMessage(e)
  } finally {
    if (seq === dealersLoadSeq) loading.value = false
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
  const seq = ++membersLoadSeq
  membersLoading.value = true
  membersError.value = ''
  membersForbidden.value = false
  const filterQ = memberQ.value
  try {
    const dealers = await fetchAllDealers()
    if (seq !== membersLoadSeq) return
    const flat: FlatMember[] = []
    for (const d of dealers) {
      const items = await fetchDealerMembers(d.id, filterQ)
      if (seq !== membersLoadSeq) return
      for (const m of items) {
        flat.push({ ...m, dealerId: d.id, legalName: d.legalName })
      }
    }
    flatMembers.value = flat
    if (memberPage.value * 10 >= flat.length) memberPage.value = 0
  } catch (e) {
    if (seq !== membersLoadSeq) return
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
    if (seq === membersLoadSeq) membersLoading.value = false
  }
}

async function openMembers(row: Dealer) {
  const seq = ++drawerMembersLoadSeq
  staffDealer.value = row
  memberDrawer.value = true
  bindError.value = ''
  drawerError.value = ''
  drawerMembers.value = []
  try {
    const items = await fetchDealerMembers(row.id, '')
    if (seq !== drawerMembersLoadSeq) return
    drawerMembers.value = items
  } catch (e) {
    if (seq !== drawerMembersLoadSeq) return
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
  const seq = ++drawerMembersLoadSeq
  const dealerId = staffDealer.value.id
  try {
    const items = await fetchDealerMembers(dealerId, '')
    if (seq !== drawerMembersLoadSeq) return
    drawerMembers.value = items
  } catch (e) {
    if (seq !== drawerMembersLoadSeq) return
    throw e
  }
}

function openDealer() {
  formError.value = ''
  drawer.value = true
  dealerFormRef.value?.clearValidate()
}

async function create() {
  formError.value = ''
  const dealerForm = dealerFormRef.value
  if (dealerForm) {
    const valid = await dealerForm.validate().then(() => true).catch(() => false)
    if (!valid) return
  } else if (!form.value.legalName || !form.value.contactPhone || !form.value.contactEmail || !form.value.contactAddress) {
    formError.value = 'Check required contact fields'
    return
  }
  const body = form.value
  try {
    await adminApi.createDealer(body)
    drawer.value = false
    form.value = { legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' }
    dealerFormRef.value?.clearValidate()
    tab.value = 'dealers'
    page.value = 0
    await loadDealers()
  } catch (e) {
    if (adminErrorCode(e) === 'VALIDATION' || adminErrorStatus(e) === 400) {
      formError.value = serverDetail(e) || 'Check required contact fields'
    } else if (isForbidden(e)) {
      formError.value = 'You do not have access to Admin.'
    } else {
      formError.value = serverDetail(e) || 'Could not create dealership.'
    }
  }
}

async function bind() {
  bindError.value = ''
  if (!staffDealer.value) return
  const memberForm = memberFormRef.value
  if (memberForm) {
    const valid = await memberForm.validate().then(() => true).catch(() => false)
    if (!valid) return
  } else if (!member.value.entraOid || !member.value.displayName || !member.value.password) {
    bindError.value = 'Check username, display name, and password'
    return
  }
  try {
    await adminApi.bind(staffDealer.value.id, member.value)
    member.value = { entraOid: '', displayName: '', password: '' }
    memberFormRef.value?.clearValidate()
    await refreshDrawerMembers()
    await loadDealers()
    if (tab.value === 'members') await loadFlatMembers()
  } catch (e) {
    const code = adminErrorCode(e)
    if (code === 'DUP_MEMBER' || adminErrorStatus(e) === 409) {
      bindError.value = 'Staff already bound'
    } else if (code === 'VALIDATION' || adminErrorStatus(e) === 400) {
      bindError.value = serverDetail(e) || 'Check username'
    } else if (code === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      bindError.value = 'Dealership not found'
    } else if (isForbidden(e)) {
      bindError.value = 'You do not have access to Admin.'
    } else {
      bindError.value = serverDetail(e) || 'Could not bind staff.'
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
      unbindError.value = serverDetail(e) || 'Could not unbind staff.'
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
        <el-button type="primary" @click="openDealer">New dealership</el-button>
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
              <el-table-column label="Username">
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
      <el-form ref="dealerFormRef" :model="form" :rules="dealerRules" label-position="top">
        <p v-if="formError" class="danger-text">{{ formError }}</p>
        <el-form-item label="Legal name" prop="legalName">
          <el-input v-model="form.legalName" />
        </el-form-item>
        <el-form-item label="Contact phone" prop="contactPhone">
          <el-input v-model="form.contactPhone" />
        </el-form-item>
        <el-form-item label="Contact email" prop="contactEmail">
          <el-input v-model="form.contactEmail" />
        </el-form-item>
        <el-form-item label="Contact address" prop="contactAddress">
          <el-input v-model="form.contactAddress" />
        </el-form-item>
        <el-button type="primary" @click="create">Create</el-button>
      </el-form>
    </FormDrawer>
    <FormDrawer :title="staffDealer ? `Staff · ${staffDealer.legalName}` : 'Staff'" :visible="memberDrawer" @close="memberDrawer = false">
      <el-form ref="memberFormRef" :model="member" :rules="memberRules" label-position="top">
        <p v-if="drawerError" class="danger-text">{{ drawerError }}</p>
        <p v-if="bindError" class="danger-text">{{ bindError }}</p>
        <el-form-item label="Username" prop="entraOid">
          <el-input v-model="member.entraOid" />
        </el-form-item>
        <el-form-item label="Display name" prop="displayName">
          <el-input v-model="member.displayName" />
        </el-form-item>
        <el-form-item label="Temporary password" prop="password">
          <el-input v-model="member.password" type="password" show-password />
        </el-form-item>
        <el-button type="primary" @click="bind">Bind staff</el-button>
      </el-form>
      <el-table :data="drawerMembers" style="margin-top:20px">
        <el-table-column prop="entraOid" label="Username" />
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
