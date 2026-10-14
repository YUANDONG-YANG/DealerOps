<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi, adminErrorCode, type Dealer, type PendingUser } from '../api/admin'
import DataTable from './DataTable.vue'
import PageState from './PageState.vue'

/**
 * Accounts waiting for a dealership (self sign-up or unbound staff). Binding uses the
 * existing member endpoint without a password, so the account keeps its own credentials
 * (design/21-Feature-Extensions.md §5).
 */
const emit = defineEmits<{ bound: [] }>()

const rows = ref<PendingUser[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')

const target = ref<PendingUser | null>(null)
const dealerOptions = ref<Dealer[]>([])
const dealerId = ref<number>()
const searching = ref(false)
const binding = ref(false)
const bindError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await adminApi.pendingUsers({ page: page.value })
    rows.value = data.items
    total.value = data.total
  } catch {
    rows.value = []
    error.value = 'Could not load pending accounts.'
  } finally {
    loading.value = false
  }
}

async function searchDealers(q: string) {
  searching.value = true
  try {
    dealerOptions.value = (await adminApi.dealers({ q })).data.items.filter((d) => d.active)
  } catch {
    dealerOptions.value = []
  } finally {
    searching.value = false
  }
}

function openBind(row: PendingUser) {
  target.value = row
  dealerId.value = undefined
  bindError.value = ''
  searchDealers('')
}

async function bind() {
  if (!target.value || dealerId.value === undefined) {
    bindError.value = 'Choose a dealership.'
    return
  }
  binding.value = true
  bindError.value = ''
  try {
    await adminApi.bind(dealerId.value, { username: target.value.username })
    target.value = null
    await load()
    emit('bound')
  } catch (e) {
    bindError.value =
      adminErrorCode(e) === 'DUP_MEMBER' ? 'This account already belongs to a dealership.' : 'Could not add the account.'
  } finally {
    binding.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="pending-accounts">
    <h3>Pending accounts</h3>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && !rows.length"
      empty-text="No accounts are waiting for a dealership."
      loading-text="Loading pending accounts…"
    >
      <DataTable :rows="rows" :total="total" :page="page" @page="p => { page = p; load() }">
        <el-table-column prop="username" label="Username" />
        <el-table-column prop="displayName" label="Name" />
        <el-table-column label="Email">
          <template #default="{ row }">{{ row.email || '—' }}</template>
        </el-table-column>
        <el-table-column label="Phone">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="Created">
          <template #default="{ row }">{{ row.createdAt.slice(0, 10) }}</template>
        </el-table-column>
        <template #actions="{ row }">
          <el-button link type="primary" @click="openBind(row)">Add to dealership</el-button>
        </template>
      </DataTable>
    </PageState>

    <el-dialog :model-value="target !== null" title="Add to dealership" width="420px" @close="target = null">
      <p v-if="target" class="muted">
        {{ target.displayName }} (@{{ target.username }}) keeps their own sign-in.
      </p>
      <el-alert v-if="bindError" type="error" :title="bindError" show-icon style="margin-bottom:12px" />
      <el-select
        v-model="dealerId"
        filterable
        remote
        :remote-method="searchDealers"
        :loading="searching"
        placeholder="Dealership"
        style="width:100%"
      >
        <el-option v-for="d in dealerOptions" :key="d.id" :label="d.legalName" :value="d.id" />
      </el-select>
      <template #footer>
        <el-button @click="target = null">Cancel</el-button>
        <el-button type="primary" :loading="binding" @click="bind">Add</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.pending-accounts {
  margin-top: 28px;
}
.pending-accounts h3 {
  margin: 0 0 12px;
  font-size: 16px;
}
</style>
