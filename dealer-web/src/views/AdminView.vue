<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AppLayout from '../layouts/AppLayout.vue'
import DataTable from '../components/DataTable.vue'
import FormDrawer from '../components/FormDrawer.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PageState from '../components/PageState.vue'
import PendingAccounts from '../components/PendingAccounts.vue'
import { adminApi, adminErrorCode, adminErrorStatus, type Dealer, type Member } from '../api/admin'
import { apiError, fieldErrorsOf } from '../api/http'

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
const creating = ref(false)
// Set while the drawer edits an existing dealership; null means New dealership.
const editingDealer = ref<Dealer | null>(null)
const logoDataUrl = ref<string | null>(null)
const LOGO_MAX_PX = 160
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
const member = ref({ username: '', displayName: '', password: '', email: '', phone: '' })
const bindError = ref('')
// Per-field messages from the bind response's fieldErrors, shown under each input.
const memberErrors = ref<Record<string, string>>({})
const binding = ref(false)
const memberRules: FormRules = {
  username: [
    { required: true, message: 'Username is required', trigger: 'blur' },
    { max: 64, message: 'At most 64 characters', trigger: 'blur' },
  ],
  displayName: [
    { required: true, message: 'Display name is required', trigger: 'blur' },
    { max: 120, message: 'At most 120 characters', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Temporary password is required', trigger: 'blur' },
    { min: 8, message: 'At least 8 characters', trigger: 'blur' },
  ],
}

let dealersLoadSeq = 0
let membersLoadSeq = 0
let drawerMembersLoadSeq = 0

const confirm = ref(false)
const pendingUnbind = ref<{ dealerId: number; username: string } | null>(null)
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
  const parts: string[] = []
  const message = apiError(error).message?.trim()
  if (message) parts.push(message)
  for (const [field, text] of Object.entries(fieldErrorsOf(error))) parts.push(`${field}: ${text}`)
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
  memberErrors.value = {}
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
  editingDealer.value = null
  form.value = { legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' }
  formError.value = ''
  drawer.value = true
  dealerFormRef.value?.clearValidate()
}

function openEdit(row: Dealer) {
  editingDealer.value = row
  form.value = {
    legalName: row.legalName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    contactAddress: row.contactAddress,
  }
  logoDataUrl.value = row.logoDataUrl
  formError.value = ''
  drawer.value = true
  dealerFormRef.value?.clearValidate()
}

/** Downscale the chosen image to a small PNG data URL so the stored logo stays light. */
function pickLogo(file: File) {
  if (!file.type.startsWith('image/')) {
    formError.value = 'Logo must be an image file'
    return false
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    logoDataUrl.value = canvas.toDataURL('image/png')
    URL.revokeObjectURL(url)
  }
  img.onerror = () => {
    formError.value = 'Could not read that image'
    URL.revokeObjectURL(url)
  }
  img.src = url
  return false
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
  if (creating.value) return
  creating.value = true
  const editing = editingDealer.value
  try {
    if (editing) {
      await adminApi.patchDealer(editing.id, {
        ...body,
        version: editing.version,
        active: editing.active,
        logoDataUrl: logoDataUrl.value,
      })
    } else {
      await adminApi.createDealer(body)
    }
    drawer.value = false
    editingDealer.value = null
    form.value = { legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' }
    dealerFormRef.value?.clearValidate()
    tab.value = 'dealers'
    if (!editing) page.value = 0
    await loadDealers()
  } catch (e) {
    if (adminErrorCode(e) === 'VALIDATION' || adminErrorStatus(e) === 400) {
      formError.value = serverDetail(e) || 'Check required contact fields'
    } else if (adminErrorCode(e) === 'VERSION_CONFLICT' || adminErrorStatus(e) === 409) {
      formError.value = 'This dealership changed elsewhere. Close and reopen Edit.'
      await loadDealers()
    } else if (isForbidden(e)) {
      formError.value = 'You do not have access to Admin.'
    } else {
      formError.value = serverDetail(e) || (editing ? 'Could not save dealership.' : 'Could not create dealership.')
    }
  } finally {
    creating.value = false
  }
}

async function bind() {
  bindError.value = ''
  memberErrors.value = {}
  if (!staffDealer.value) return
  const memberForm = memberFormRef.value
  if (memberForm) {
    const valid = await memberForm.validate().then(() => true).catch(() => false)
    if (!valid) return
  }
  if (!member.value.username || !member.value.displayName || !member.value.password
    || (!member.value.email.trim() && !member.value.phone.trim())) {
    bindError.value = 'Enter the account details and an email or phone number.'
    return
  }
  if (binding.value) return
  binding.value = true
  try {
    await adminApi.bind(staffDealer.value.id, member.value)
    member.value = { username: '', displayName: '', password: '', email: '', phone: '' }
    memberFormRef.value?.clearValidate()
    await refreshDrawerMembers()
    await loadDealers()
    if (tab.value === 'members') await loadFlatMembers()
  } catch (e) {
    const code = adminErrorCode(e)
    // VALIDATION and USERNAME/DISPLAY_NAME/EMAIL/PHONE_TAKEN carry fieldErrors keyed by form field.
    const fields = fieldErrorsOf(e)
    if (Object.keys(fields).length) {
      memberErrors.value = fields
    } else if (code === 'DUP_MEMBER') {
      bindError.value = 'Staff already bound'
    } else if (code === 'VALIDATION' || adminErrorStatus(e) === 400) {
      bindError.value = apiError(e).message || 'Check the account details.'
    } else if (code === 'NOT_FOUND' || adminErrorStatus(e) === 404) {
      bindError.value = 'Dealership not found'
    } else if (isForbidden(e)) {
      bindError.value = 'You do not have access to Admin.'
    } else {
      bindError.value = serverDetail(e) || 'Could not bind staff.'
    }
  } finally {
    binding.value = false
  }
}

const statusBusy = ref('')

// Status switch: on re-activates the membership through the bind endpoint (existing account, username only);
// off deactivates it through Unbind after the confirmation dialog.
async function setStatus(dealerId: number, username: string, active: boolean) {
  if (!active) {
    askUnbind(dealerId, username)
    return
  }
  statusBusy.value = `${dealerId}:${username}`
  try {
    await adminApi.bind(dealerId, { username })
    if (staffDealer.value?.id === dealerId) await refreshDrawerMembers()
    await loadDealers()
    if (tab.value === 'members') await loadFlatMembers()
  } catch (e) {
    if (adminErrorCode(e) === 'DUP_MEMBER' || adminErrorStatus(e) === 409) {
      ElMessage.error('Already active at another dealership. Deactivate it there first.')
    } else if (isForbidden(e)) {
      ElMessage.error('You do not have access to Admin.')
    } else {
      ElMessage.error(serverDetail(e) || 'Could not activate staff.')
    }
  } finally {
    statusBusy.value = ''
  }
}

function askUnbind(dealerId: number, username: string) {
  pendingUnbind.value = { dealerId, username }
  unbindError.value = ''
  confirm.value = true
}

async function unbind() {
  if (!pendingUnbind.value) return
  const { dealerId, username } = pendingUnbind.value
  try {
    await adminApi.unbind(dealerId, username)
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
  // Always reload: binds and unbinds from the Staff drawer happen while this tab is hidden.
  if (name === 'members') {
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
              <el-table-column label="Name">
                <template #default="{ row }">
                  <img v-if="row.logoDataUrl" :src="row.logoDataUrl" alt="" class="dealer-logo-sm" />{{ row.legalName }}
                </template>
              </el-table-column>
              <el-table-column label="Contact">
                <template #default="{ row }">{{ row.contactPhone }} / {{ row.contactEmail }}</template>
              </el-table-column>
              <el-table-column label="Staff count">
                <template #default="{ row }">{{ staffCount(row) }}</template>
              </el-table-column>
              <template #actions="{ row }">
                <el-button link type="primary" @click="openEdit(row)">Edit</el-button>
                <el-button link type="primary" @click="openMembers(row)">Staff</el-button>
              </template>
            </DataTable>
          </PageState>
        </el-tab-pane>
        <el-tab-pane label="Members" name="members">
          <div class="filters">
            <el-input v-model="memberQ" placeholder="Username" clearable />
            <el-button @click="memberPage = 0; loadFlatMembers()">Search</el-button>
            <el-button @click="memberQ = ''; memberPage = 0; loadFlatMembers()">Reset</el-button>
          </div>
          <PageState
            :loading="membersLoading"
            :error="membersError"
            :forbidden="membersForbidden"
            :empty="!membersLoading && !membersError && !membersForbidden && !flatMembers.length"
            empty-text="No members yet."
            loading-text="Loading members…"
            forbidden-text="You do not have access to Admin."
          >
            <DataTable
              :rows="pagedMembers"
              :total="flatMembers.length"
              :page="memberPage"
              @page="p => { memberPage = p }"
            >
              <el-table-column label="Username">
                <template #default="{ row }">{{ row.username }}</template>
              </el-table-column>
              <el-table-column prop="legalName" label="Dealership" />
              <el-table-column label="Status">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.active"
                    :loading="statusBusy === `${row.dealerId}:${row.username}`"
                    inline-prompt
                    active-text="Active"
                    inactive-text="Inactive"
                    class="status-switch"
                    @change="(v: string | number | boolean) => setStatus(row.dealerId, row.username, Boolean(v))"
                  />
                </template>
              </el-table-column>
            </DataTable>
          </PageState>
          <PendingAccounts @bound="loadFlatMembers()" />
        </el-tab-pane>
      </el-tabs>
    </div>
    <FormDrawer :title="editingDealer ? 'Edit dealership' : 'New dealership'" :visible="drawer" @close="drawer = false">
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
        <el-form-item v-if="editingDealer" label="Logo">
          <div class="logo-field">
            <img v-if="logoDataUrl" :src="logoDataUrl" alt="Dealership logo" class="dealer-logo" />
            <el-upload :show-file-list="false" accept="image/png,image/jpeg,image/webp" :before-upload="pickLogo">
              <el-button>{{ logoDataUrl ? 'Replace logo' : 'Upload logo' }}</el-button>
            </el-upload>
            <el-button v-if="logoDataUrl" link type="danger" @click="logoDataUrl = null">Remove</el-button>
          </div>
        </el-form-item>
        <el-button type="primary" :loading="creating" @click="create">{{ editingDealer ? 'Save' : 'Create' }}</el-button>
      </el-form>
    </FormDrawer>
    <FormDrawer :title="staffDealer ? `Staff · ${staffDealer.legalName}` : 'Staff'" :visible="memberDrawer" @close="memberDrawer = false">
      <el-form ref="memberFormRef" :model="member" :rules="memberRules" label-position="top">
        <p v-if="drawerError" class="danger-text">{{ drawerError }}</p>
        <p v-if="bindError" class="danger-text">{{ bindError }}</p>
        <el-form-item label="Username" prop="username" :error="memberErrors.username">
          <el-input v-model="member.username" />
        </el-form-item>
        <el-form-item label="Display name" prop="displayName" :error="memberErrors.displayName">
          <el-input v-model="member.displayName" />
        </el-form-item>
        <el-form-item label="Temporary password" prop="password" :error="memberErrors.password">
          <el-input v-model="member.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Login email" :error="memberErrors.email">
          <el-input v-model="member.email" type="email" autocomplete="email" />
        </el-form-item>
        <el-form-item label="Login phone with country code (email, phone, or both)" :error="memberErrors.phone">
          <el-input v-model="member.phone" type="tel" autocomplete="tel" />
        </el-form-item>
        <el-button type="primary" :loading="binding" @click="bind">Bind staff</el-button>
      </el-form>
      <el-table :data="drawerMembers" style="margin-top:20px">
        <el-table-column prop="username" label="Username" />
        <el-table-column prop="displayName" label="Name" />
        <el-table-column label="Status">
          <template #default="{ row }">
            <el-switch
              v-if="staffDealer"
              :model-value="row.active"
              :loading="statusBusy === `${staffDealer.id}:${row.username}`"
              inline-prompt
              active-text="Active"
              inactive-text="Inactive"
              class="status-switch"
              @change="(v: string | number | boolean) => setStatus(staffDealer!.id, row.username, Boolean(v))"
            />
          </template>
        </el-table-column>
      </el-table>
    </FormDrawer>
    <ConfirmDialog
      :visible="confirm"
      title="Deactivate staff"
      :message="unbindError || 'Deactivate this staff membership? They lose access to this dealership until reactivated.'"
      @cancel="confirm = false; pendingUnbind = null"
      @confirm="unbind"
    />
  </AppLayout>
</template>
