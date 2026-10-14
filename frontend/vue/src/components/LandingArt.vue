<script setup lang="ts">
// Illustrative mini screens for the landing feature and step cards; each shows the feature's success state. Not live data.
export type LandingArtKind =
  | 'inventory'
  | 'customers'
  | 'compliance'
  | 'assistant'
  | 'tenants'
  | 'audit'
  | 'write'
  | 'check'
  | 'review'
  | 'export'

defineProps<{ kind: LandingArtKind }>()
</script>

<template>
  <div class="art" aria-hidden="true">
    <div v-if="kind === 'inventory'" class="art-panel">
      <div class="art-row"><span>2021 Toyota RAV4</span><span class="art-chip ok">In stock</span></div>
      <div class="art-row"><span>2020 Mazda CX-5</span><span class="art-chip ok">In stock</span></div>
      <div class="art-row"><span>2019 Honda Civic</span><span class="art-chip done">Sold · +$3,200</span></div>
    </div>

    <div v-else-if="kind === 'customers'" class="art-panel art-center">
      <div class="art-person"><span class="art-avatar">PB</span><div><strong>Pat Buyer</strong><small>Customer since 2024</small></div></div>
      <div class="art-link">✓ Linked to 2021 Toyota RAV4</div>
    </div>

    <div v-else-if="kind === 'compliance' || kind === 'check'" class="art-panel">
      <div class="art-check">✓ All-in price shown</div>
      <div class="art-check">✓ APR and term disclosed</div>
      <div class="art-check">✓ Dealer name present</div>
      <span class="art-chip ok art-corner">{{ kind === 'check' ? 'Rules passed' : 'Passed' }}</span>
    </div>

    <div v-else-if="kind === 'assistant'" class="art-panel art-chat">
      <div class="art-bubble me">Any Toyota in stock?</div>
      <div class="art-bubble bot">3 matches · 2021 RAV4, 2022 Corolla…</div>
    </div>

    <div v-else-if="kind === 'tenants'" class="art-tenants">
      <div class="art-panel art-tenant"><strong>Mazda North</strong><small>🔒 42 vehicles</small></div>
      <div class="art-panel art-tenant"><strong>Toyota West</strong><small>🔒 37 vehicles</small></div>
    </div>

    <div v-else-if="kind === 'audit'" class="art-panel art-timeline">
      <div><i />Price updated <small>robin · 2m ago</small></div>
      <div><i />Customer linked <small>lafe · 1h ago</small></div>
      <div><i />Vehicle added <small>robin · today</small></div>
    </div>

    <div v-else-if="kind === 'write'" class="art-panel">
      <strong class="art-title">2021 Toyota RAV4 XLE</strong>
      <div class="art-line" />
      <div class="art-line" />
      <div class="art-price">$28,995 all-in</div>
    </div>

    <div v-else-if="kind === 'review'" class="art-panel art-center">
      <div class="art-ai">✦ AI review</div>
      <div class="art-link">✓ No misleading claims found</div>
    </div>

    <div v-else class="art-panel art-center">
      <div class="art-file">📄 ad-rav4-xle.txt</div>
      <div class="art-chip ok">Ready · exported</div>
    </div>
  </div>
</template>
