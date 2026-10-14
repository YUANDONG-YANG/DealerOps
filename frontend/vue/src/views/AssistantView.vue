<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageState from '../components/PageState.vue'
import AssistantCard from '../components/AssistantCard.vue'
import { assistantApi, type AssistantCardDto, type AskResponse } from '../api/assistant'
import { codeOf, statusOf } from '../api/http'

// Floating assistant widget mounted once in App.vue for Dealer.User, so the conversation survives page changes.
type Turn = { id: number; question: string; pending: boolean; result?: AskResponse; error?: string }

const suggestions = ['Which Toyota vehicles are in stock?', 'Any unsold trucks?', 'Find customer Smith']

const router = useRouter()
const panelOpen = ref(false)
const text = ref('')
const hint = ref('')
const forbidden = ref(false)
const turns = ref<Turn[]>([])
const threadEl = ref<HTMLElement>()
const inputRef = ref<{ focus: () => void }>()
let nextId = 1

function busy() {
  return turns.value.some((t) => t.pending)
}

function cards(turn: Turn) {
  return (turn.result?.cards || []).slice(0, 5)
}

function summaryText(turn: Turn) {
  const r = turn.result
  if (r && r.summaryAvailable && r.summary != null) return r.summary
  return 'Smart summary unavailable'
}

function scrollToEnd() {
  nextTick(() => threadEl.value?.scrollTo?.({ top: threadEl.value.scrollHeight, behavior: 'smooth' }))
}

function toggle() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    scrollToEnd()
    nextTick(() => inputRef.value?.focus())
  }
}

async function run(turn: Turn) {
  turn.pending = true
  turn.error = undefined
  turn.result = undefined
  scrollToEnd()
  try {
    turn.result = (await assistantApi.ask(turn.question)).data
  } catch (err) {
    if (statusOf(err) === 403 || codeOf(err) === 'FORBIDDEN') {
      forbidden.value = true
    } else if (statusOf(err) === 400 || codeOf(err) === 'VALIDATION') {
      turn.error = 'The assistant could not read that question. Try rephrasing it.'
    } else {
      turn.error = 'Could not ask assistant.'
    }
  } finally {
    turn.pending = false
    scrollToEnd()
  }
}

function ask(question = text.value) {
  if (busy()) return
  const q = question.trim()
  if (!q) {
    hint.value = 'Please enter a question.'
    return
  }
  hint.value = ''
  text.value = ''
  turns.value.push({ id: nextId++, question: q, pending: false })
  run(turns.value[turns.value.length - 1])
}

function onEnter(e: KeyboardEvent) {
  if (e.isComposing) return
  ask()
}

function retry(turn: Turn) {
  if (!busy()) run(turn)
}

function clearThread() {
  turns.value = []
  hint.value = ''
}

function open(card: AssistantCardDto) {
  panelOpen.value = false
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
  <div class="assistant-widget">
    <transition name="assistant-pop">
      <section v-show="panelOpen" class="assistant-panel" role="dialog" aria-label="Assistant" @keydown.esc="panelOpen = false">
        <header class="assistant-panel-head">
          <div>
            <strong>Assistant</strong>
            <div class="muted assistant-panel-sub">Read-only · up to five matches per answer</div>
          </div>
          <div>
            <el-button v-if="turns.length" link :disabled="busy()" @click="clearThread">Clear</el-button>
            <el-button link aria-label="Close assistant" @click="panelOpen = false">✕</el-button>
          </div>
        </header>
        <PageState :forbidden="forbidden" forbidden-text="You do not have access to Assistant.">
          <div ref="threadEl" class="chat-thread">
            <div v-if="!turns.length" class="chat-welcome">
              <p>Search by make, VIN or customer name. Try one of these:</p>
              <div class="chat-suggestions">
                <el-button v-for="s in suggestions" :key="s" round size="small" @click="ask(s)">{{ s }}</el-button>
              </div>
            </div>
            <template v-for="turn in turns" :key="turn.id">
              <div class="chat-row chat-row-user"><div class="chat-bubble chat-bubble-user">{{ turn.question }}</div></div>
              <div class="chat-row">
                <div class="chat-bubble chat-bubble-bot">
                  <div v-if="turn.pending" class="chat-typing" aria-label="Asking…"><span /><span /><span /></div>
                  <div v-else-if="turn.error" class="danger-text">
                    {{ turn.error }}
                    <el-button link type="primary" :disabled="busy()" @click="retry(turn)">Retry</el-button>
                  </div>
                  <template v-else-if="turn.result">
                    <div class="chat-summary" :class="{ muted: !turn.result.summaryAvailable }">{{ summaryText(turn) }}</div>
                    <div v-if="cards(turn).length" class="card-grid chat-cards">
                      <AssistantCard v-for="c in cards(turn)" :key="c.kind + c.id" :card="c" @open="open(c)" />
                    </div>
                    <div v-else class="muted chat-note">No matching records. Try a make, VIN or customer name.</div>
                  </template>
                </div>
              </div>
            </template>
          </div>
          <div class="chat-composer">
            <el-input ref="inputRef" v-model="text" placeholder="Ask about this dealership…" @keydown.enter="onEnter">
              <template #append>
                <el-button :loading="busy()" :disabled="busy()" @click="ask()">Ask</el-button>
              </template>
            </el-input>
            <div v-if="hint" class="warning-text chat-hint">{{ hint }}</div>
          </div>
        </PageState>
      </section>
    </transition>
    <button type="button" class="assistant-fab" :class="{ open: panelOpen }" :aria-label="panelOpen ? 'Close assistant' : 'Open assistant'" @click="toggle">
      <svg v-if="!panelOpen" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 7V4" /><circle cx="12" cy="3.5" r="1" /><circle cx="9" cy="13" r="1.2" fill="currentColor" /><circle cx="15" cy="13" r="1.2" fill="currentColor" /><path d="M2 12v3M22 12v3" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
</template>
