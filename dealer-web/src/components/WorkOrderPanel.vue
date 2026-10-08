<script setup lang="ts">
import { ref, watch } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { codeOf, messageOf } from '../api/http'
import { workOrdersApi, type WorkOrder, type WorkOrderStatus } from '../api/workOrders'
import { memberLabel, membersApi, type MemberOption } from '../api/members'

// Reconditioning work orders inside the DMS vehicle drawer (design/21-Feature-Extensions.md §4).
const props = defineProps<{ vehicleId: number; sold: boolean }>()
// Fired after a change that also changes the vehicle (Done adds to the repair cost) or its audit.
const emit = defineEmits<{ changed: [] }>()

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/
const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}
const STATUS_TYPE: Record<WorkOrderStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
}

const orders = ref<WorkOrder[]>([])
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const newTask = ref('')
const newDueOn = ref('')
const newAssignee = ref('')
const members = ref<MemberOption[]>([])
const adding = ref(false)
const doneFor = ref<WorkOrder | null>(null)
const doneForm = ref({ cost: '', completionNote: '' })
const doneError = ref('')
const cancelFor = ref<WorkOrder | null>(null)

function writeError(e: unknown) {
  const code = codeOf(e)
  if (code === 'SOLD_LOCKED') return 'Sold vehicles cannot have work orders.'
  if (code === 'WORK_ORDER_CLOSED') return 'This work order is already closed.'
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  return messageOf(e, 'Could not save work order.')
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    orders.value = (await workOrdersApi.list(props.vehicleId)).data
  } catch {
    orders.value = []
    loadError.value = 'Could not load work orders.'
  } finally {
    loading.value = false
  }
}

async function add() {
  actionError.value = ''
  const task = newTask.value.trim()
  if (!task) {
    actionError.value = 'Enter a task.'
    return
  }
  adding.value = true
  try {
    await workOrdersApi.create(props.vehicleId, {
      task,
      assigneeUsername: newAssignee.value || null,
      dueOn: newDueOn.value || null,
    })
    newTask.value = ''
    newDueOn.value = ''
    newAssignee.value = ''
    await load()
    emit('changed')
  } catch (e) {
    actionError.value = writeError(e)
  } finally {
    adding.value = false
  }
}

async function move(order: WorkOrder, status: WorkOrderStatus, extra: { cost?: number; completionNote?: string } = {}) {
  await workOrdersApi.patch(order.id, {
    status,
    task: order.task,
    assigneeUsername: order.assigneeUsername,
    dueOn: order.dueOn,
    ...extra,
    version: order.version,
  })
  await load()
  emit('changed')
}

async function start(order: WorkOrder) {
  actionError.value = ''
  try {
    await move(order, 'IN_PROGRESS')
  } catch (e) {
    actionError.value = writeError(e)
  }
}

function openDone(order: WorkOrder) {
  doneFor.value = order
  doneForm.value = { cost: '', completionNote: '' }
  doneError.value = ''
}

async function confirmDone() {
  const order = doneFor.value
  if (!order) return
  const costText = doneForm.value.cost.trim()
  const note = doneForm.value.completionNote.trim()
  if (!note || !costText) {
    doneError.value = 'Enter a completion note and a cost.'
    return
  }
  if (!MONEY_PATTERN.test(costText)) {
    doneError.value = 'Cost must be 0 or more with at most 2 decimals.'
    return
  }
  try {
    await move(order, 'DONE', { cost: Number(costText), completionNote: note })
    doneFor.value = null
  } catch (e) {
    doneError.value = writeError(e)
  }
}

async function confirmCancel() {
  const order = cancelFor.value
  cancelFor.value = null
  if (!order) return
  actionError.value = ''
  try {
    await move(order, 'CANCELLED')
  } catch (e) {
    actionError.value = writeError(e)
  }
}

async function loadMembers() {
  try {
    members.value = (await membersApi.list()).data || []
  } catch {
    members.value = []
  }
}

watch(() => props.vehicleId, load, { immediate: true })
loadMembers()
</script>

<template>
  <div class="work-orders">
    <div class="muted">Work orders</div>
    <p v-if="loadError" class="danger-text">{{ loadError }}</p>
    <el-table v-loading="loading" :data="orders" empty-text="No work orders.">
      <el-table-column prop="task" label="Task" />
      <el-table-column label="Assignee" width="120">
        <template #default="{ row }">{{ row.assigneeUsername || '—' }}</template>
      </el-table-column>
      <el-table-column label="Status" width="120">
        <template #default="{ row }">
          <el-tag :type="STATUS_TYPE[row.status as WorkOrderStatus]">{{ STATUS_LABEL[row.status as WorkOrderStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Due / done" width="110">
        <template #default="{ row }">{{ row.completedOn || row.dueOn || '—' }}</template>
      </el-table-column>
      <el-table-column label="Cost" width="90">
        <template #default="{ row }">{{ row.cost == null ? '—' : Number(row.cost).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column v-if="!sold" label="Actions" width="170">
        <template #default="{ row }">
          <template v-if="row.status === 'OPEN' || row.status === 'IN_PROGRESS'">
            <el-button v-if="row.status === 'OPEN'" link type="primary" @click="start(row)">Start</el-button>
            <el-button link type="primary" @click="openDone(row)">Done</el-button>
            <el-button link type="danger" @click="cancelFor = row">Cancel</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="!sold" class="work-orders-add">
      <el-input v-model="newTask" placeholder="New task, e.g. Replace front brake pads" maxlength="200" />
      <el-select v-model="newAssignee" placeholder="Assignee" clearable filterable class="work-orders-assignee">
        <el-option v-for="m in members" :key="m.username" :label="memberLabel(m)" :value="m.username" />
      </el-select>
      <el-input v-model="newDueOn" type="date" class="work-orders-due" />
      <el-button :loading="adding" @click="add">Add work order</el-button>
    </div>
    <p v-if="actionError" class="danger-text">{{ actionError }}</p>

    <ConfirmDialog :visible="!!doneFor" title="Finish work order" confirm-label="Mark done" @cancel="doneFor = null" @confirm="confirmDone">
      <el-form label-position="top">
        <el-form-item label="Completion note">
          <el-input v-model="doneForm.completionNote" type="textarea" maxlength="500" />
        </el-form-item>
        <el-form-item label="Cost (CAD), added to the repair cost">
          <el-input v-model="doneForm.cost" />
        </el-form-item>
        <p v-if="doneError" class="danger-text">{{ doneError }}</p>
      </el-form>
    </ConfirmDialog>
    <ConfirmDialog
      :visible="!!cancelFor"
      title="Cancel work order"
      message="Cancel this work order? It cannot be reopened."
      confirm-label="Cancel work order"
      @cancel="cancelFor = null"
      @confirm="confirmCancel"
    />
  </div>
</template>

<style scoped>
.work-orders {
  margin: 16px 0;
}
.work-orders-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.work-orders-due,
.work-orders-assignee {
  width: 160px;
  flex: none;
}
</style>
