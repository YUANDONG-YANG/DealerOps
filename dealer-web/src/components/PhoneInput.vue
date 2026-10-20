<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Phone number with a country-code picker. v-model is the international form the API expects,
 * "+<country code><national digits>", or "" while the number is empty. A leading trunk "0"
 * (for example a UK "07…") is dropped, because the country code replaces it.
 */
const props = withDefaults(defineProps<{ modelValue: string; placeholder?: string }>(), {
  placeholder: 'Phone number',
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

type Country = { iso: string; name: string; dial: string }

// Canada first (the demo dealerships are in Alberta); +1 is shared with the United States.
const COUNTRIES: Country[] = [
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'TW', name: 'Taiwan', dial: '886' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'MX', name: 'Mexico', dial: '52' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
]

const country = ref('CA')
const national = ref('')

function dialOf(iso: string) {
  return COUNTRIES.find((c) => c.iso === iso)?.dial ?? '1'
}

function emitValue() {
  const digits = national.value.replace(/\D/g, '').replace(/^0+/, '')
  emit('update:modelValue', digits ? `+${dialOf(country.value)}${digits}` : '')
}

// Follow outside changes (a form reset, or a value set by the parent): pick the country whose
// code matches, preferring the one already selected so +1 stays on Canada or the United States.
watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      national.value = ''
      return
    }
    const digits = value.replace(/\D/g, '')
    const current = dialOf(country.value)
    const match = digits.startsWith(current)
      ? COUNTRIES.find((c) => c.iso === country.value)
      : [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial))
    if (match && `+${match.dial}${national.value.replace(/\D/g, '').replace(/^0+/, '')}` !== value) {
      country.value = match.iso
      national.value = digits.slice(match.dial.length)
    }
  },
  { immediate: true },
)
</script>

<template>
  <el-input
    v-model="national"
    type="tel"
    autocomplete="tel-national"
    :placeholder="placeholder"
    class="phone-input"
    @input="emitValue"
    @blur="emit('blur')"
  >
    <template #prepend>
      <el-select
        v-model="country"
        filterable
        class="phone-country"
        aria-label="Country code"
        @change="emitValue"
      >
        <el-option
          v-for="c in COUNTRIES"
          :key="c.iso"
          :value="c.iso"
          :label="`${c.iso} +${c.dial}`"
        >
          <span>{{ c.name }}</span>
          <span class="phone-dial">+{{ c.dial }}</span>
        </el-option>
      </el-select>
    </template>
  </el-input>
</template>

<style scoped>
.phone-country {
  width: 104px;
}
.phone-dial {
  float: right;
  margin-left: 16px;
  color: var(--el-text-color-secondary);
}
</style>
