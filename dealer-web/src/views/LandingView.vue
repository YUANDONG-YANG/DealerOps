<script setup lang="ts">
import { ref } from 'vue'
import BrandMark from '../components/BrandMark.vue'
import LandingArt, { type LandingArtKind } from '../components/LandingArt.vue'
import { catalogApi, vinDecodeError, type VinDecode } from '../api/catalog'
import rav4 from '../assets/landing/rav4.webp'
import civic from '../assets/landing/civic.webp'
import f150 from '../assets/landing/f150.webp'

const features: { title: string; text: string; art: LandingArtKind }[] = [
  { title: 'Vehicle inventory', text: 'Record every vehicle with the required fields, search and filter stock, and sell with a locked purchase history.', art: 'inventory' },
  { title: 'Customer records', text: 'Keep customer details in one place and link each customer to the vehicles they bought or are considering.', art: 'customers' },
  { title: 'Ad compliance', text: 'Check each ad against the cash, finance, and lease rules, then let AI review the copy before it can be exported.', art: 'compliance' },
  { title: 'Dealership assistant', text: 'Ask questions about your own stock and customers. The assistant reads data and never changes it.', art: 'assistant' },
  { title: 'Separate dealerships', text: 'Each dealership sees only its own records, and staff accounts are issued by the platform administrator.', art: 'tenants' },
  { title: 'Audit history', text: 'Every vehicle and customer change records who made it and when, newest first.', art: 'audit' },
]

const steps: { title: string; text: string; art: LandingArtKind }[] = [
  { title: 'Write the ad', text: 'Draft the listing for a vehicle in stock.', art: 'write' },
  { title: 'Run the check', text: 'Hard rules run first; a missing price or APR blocks the ad.', art: 'check' },
  { title: 'AI review', text: 'A real model reviews the copy. If it is unavailable, the ad is never shown as passed.', art: 'review' },
  { title: 'Export', text: 'Only a current passed check can be marked ready and exported.', art: 'export' },
]

// Illustrative rows for the dashboard preview; they are not live data.
const previewRows = [
  { vehicle: '2021 Toyota RAV4 XLE', status: 'In stock', check: 'Passed', tone: 'ok', photo: rav4 },
  { vehicle: '2019 Honda Civic LX', status: 'In stock', check: 'Blocked', tone: 'bad', photo: civic },
  { vehicle: '2022 Ford F-150 XLT', status: 'Sold', check: 'Stale', tone: 'warn', photo: f150 },
]

const SAMPLE_VIN = '1HGCM82633A004352'
const vin = ref('')
const decoding = ref(false)
const vinError = ref('')
const decoded = ref<VinDecode>()

function vinFacts(d: VinDecode) {
  return [
    ['Make', d.make],
    ['Model', d.model],
    ['Year', d.modelYear],
    ['Body class', d.bodyClass],
    ['Engine', d.engine],
    ['Country', d.country],
    ['Manufacturer', d.manufacturer],
  ] as const
}

async function decode() {
  const value = vin.value.trim()
  if (decoding.value) return
  if (!value) {
    vinError.value = 'Enter a 17-character VIN.'
    return
  }
  decoding.value = true
  vinError.value = ''
  try {
    decoded.value = (await catalogApi.decodeVin(value)).data
  } catch (err) {
    decoded.value = undefined
    vinError.value = vinDecodeError(err)
  } finally {
    decoding.value = false
  }
}

function trySample() {
  vin.value = SAMPLE_VIN
  void decode()
}
</script>

<template>
  <div class="landing">
    <header class="landing-nav">
      <div class="landing-brand"><BrandMark />Dealer Ops</div>
      <nav class="landing-links" aria-label="Sections">
        <a href="#features">Features</a>
        <a href="#vin">VIN decoder</a>
        <a href="#compliance">Compliance</a>
      </nav>
      <div class="landing-auth-links">
        <router-link to="/register">Create account</router-link>
        <router-link to="/login"><el-button type="primary">Sign in</el-button></router-link>
      </div>
    </header>

    <section class="landing-hero">
      <div class="landing-hero-copy">
        <span class="landing-eyebrow">Dealership back office</span>
        <h1>Run your dealership with ads that are checked before they go out.</h1>
        <p class="muted">
          Dealer Ops brings vehicle inventory, customer records, and AI-reviewed ad compliance into one place
          for each dealership.
        </p>
        <div class="landing-actions">
          <router-link to="/login"><el-button type="primary" size="large">Sign in</el-button></router-link>
          <router-link to="/register"><el-button size="large">Create account</el-button></router-link>
          <a href="#vin"><el-button size="large">Decode a VIN</el-button></a>
        </div>
      </div>
      <div class="landing-preview" aria-label="Dashboard preview">
        <div class="landing-preview-head">
          <span>Inventory</span>
          <span class="muted">Preview</span>
        </div>
        <router-link v-for="row in previewRows" :key="row.vehicle" to="/login" class="landing-preview-row">
          <img :src="row.photo" :alt="`${row.vehicle}, front three-quarter view`" loading="lazy" />
          <div class="landing-preview-text">
            <strong>{{ row.vehicle }}</strong>
            <span>{{ row.status }}</span>
          </div>
          <span :class="['landing-chip', `landing-chip-${row.tone}`]">{{ row.check }}</span>
        </router-link>
      </div>
    </section>

    <section id="features" class="landing-section">
      <h2>Everything the back office needs</h2>
      <div class="landing-grid">
        <el-card v-for="item in features" :key="item.title" shadow="always" class="landing-card">
          <LandingArt :kind="item.art" />
          <h3>{{ item.title }}</h3>
          <p class="muted">{{ item.text }}</p>
        </el-card>
      </div>
    </section>

    <section id="vin" class="landing-section landing-vin">
      <div class="landing-vin-copy">
        <h2>Decode any VIN</h2>
        <p class="muted">
          Enter a VIN to look up the vehicle in the NHTSA vPIC catalog. Signed-in staff can decode a VIN in DMS to
          start a vehicle record with the make, model, and year filled in.
        </p>
        <el-input v-model="vin" size="large" maxlength="17" placeholder="17-character VIN" @keydown.enter="decode">
          <template #append>
            <el-button :loading="decoding" @click="decode">Decode</el-button>
          </template>
        </el-input>
        <div v-if="vinError" class="danger-text landing-vin-hint">{{ vinError }}</div>
        <div v-else class="muted landing-vin-hint">
          No VIN handy? <el-button link type="primary" @click="trySample">Try {{ SAMPLE_VIN }}</el-button>
        </div>
      </div>
      <div class="landing-vin-result" aria-live="polite">
        <template v-if="decoded">
          <div class="landing-vin-head">
            <strong>{{ [decoded.modelYear, decoded.make, decoded.model].filter(Boolean).join(' ') }}</strong>
            <span class="landing-chip landing-chip-ok">Decoded</span>
          </div>
          <dl class="landing-vin-facts">
            <div v-for="[label, value] in vinFacts(decoded)" :key="label">
              <dt>{{ label }}</dt>
              <dd>{{ value ?? '—' }}</dd>
            </div>
          </dl>
        </template>
        <div v-else class="landing-vin-empty muted">Vehicle details appear here: make, model, year, body class, engine, country, and manufacturer.</div>
      </div>
    </section>

    <section id="compliance" class="landing-section">
      <h2>How an ad gets approved</h2>
      <ol class="landing-steps">
        <li v-for="(step, i) in steps" :key="step.title">
          <LandingArt :kind="step.art" />
          <span class="landing-step-num">{{ i + 1 }}</span>
          <h3>{{ step.title }}</h3>
          <p class="muted">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <section class="landing-cta">
      <h2>Ready to get started?</h2>
      <p>Sign in, or create an account and ask your platform administrator to add it to your dealership.</p>
      <router-link to="/login"><el-button size="large">Sign in</el-button></router-link>
      <router-link to="/register"><el-button size="large">Create account</el-button></router-link>
    </section>

    <p class="landing-credit muted">Vehicle photos by Stephen Andrews, Harrison Fitts, and Caleb White on Unsplash.</p>
  </div>
</template>
