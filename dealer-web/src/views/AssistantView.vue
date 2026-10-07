<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import PageState from '../components/PageState.vue'
import AssistantCard from '../components/AssistantCard.vue'
import { assistantApi, type AssistantCardDto, type AskResponse } from '../api/assistant'
import { codeOf, statusOf } from '../api/http'

const router = useRouter()
const text = ref('')
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const result = ref<AskResponse>()
const asked = ref(false)

function cards() {
  return (result.value?.cards || []).slice(0, 5)
}

function summaryText() {
  const r = result.value
  if (r && r.summaryAvailable && r.summary != null) return r.summary
  return 'Smart summary unavailable'
}

async function ask() {
  if (loading.value) return
  if (!text.value.trim()) {
    error.value = 'Please enter a question.'
    forbidden.value = false
    result.value = undefined
    return
  }
  loading.value = true
  error.value = ''
  forbidden.value = false
  asked.value = true
  try {
    result.value = (await assistantApi.ask(text.value)).data
  } catch (err) {
    result.value = undefined
    if (statusOf(err) === 403 || codeOf(err) === 'FORBIDDEN') {
      forbidden.value = true
      error.value = ''
    } else if (statusOf(err) === 400 || codeOf(err) === 'VALIDATION') {
      error.value = 'Please enter a question.'
    } else {
      error.value = 'Could not ask assistant.'
    }
  } finally {
    loading.value = false
  }
}

function open(card: AssistantCardDto) {
  if (card.kind === 'VEHICLE') {
    router.push({ path: '/dms', query: { vehicleId: String(card.id) } })
    return
  }
  if (card.kind === 'CUSTOMER') {
    router.push({ path: '/crm', query: { customerId: String(card.id) } })
    return
  }
  if (card.vehicleId != null) {
    router.push({ path: '/ads', query: { vehicleId: String(card.vehicleId) } })
    return
  }
  router.push({ path: '/ads' })
}
</script>

<template>
  <AppLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Assistant</h1>
          <span class="muted">Ask about this dealership</span>
        </div>
      </div>
      <p class="muted">Read-only: this assistant never changes dealership records. Search by make, VIN or customer name, or ask “Which Toyota vehicles are in stock?” Results show up to five matches, not a total count.</p>
      <el-card>
        <el-input v-model="text" placeholder="Ask a question about this dealership." @keyup.enter="ask">
          <template #append>
            <el-button :loading="loading" :disabled="loading" @click="ask">Ask</el-button>
          </template>
        </el-input>
      </el-card>
      <PageState
        :loading="loading"
        :error="error"
        :forbidden="forbidden"
        :empty="!asked && !forbidden"
        empty-text="Ask a question about this dealership."
        loading-text="Asking…"
        forbidden-text="You do not have access to Assistant."
      >
        <div v-if="result" style="margin-top:18px">
          <div class="summary">{{ summaryText() }}</div>
          <div class="card-grid" style="margin-top:18px">
            <AssistantCard v-for="c in cards()" :key="c.kind + c.id" :card="c" @open="open(c)" />
          </div>
        </div>
      </PageState>
    </div>
  </AppLayout>
</template>
