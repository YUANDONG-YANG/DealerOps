<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { codeOf, messageOf } from '../api/http'
import { PHOTO_MAX_BYTES, photosApi, type PhotoItem, type PhotoPreset, type PhotoVariant } from '../api/photos'

// Image Studio inside the DMS vehicle drawer (design/21-Feature-Extensions.md §6).
const props = defineProps<{ vehicleId: number }>()

const PRESETS: { value: PhotoPreset; label: string }[] = [
  { value: 'AUTO', label: 'Auto fix' },
  { value: 'BRIGHTEN', label: 'Brighten' },
  { value: 'SHARPEN', label: 'Sharpen' },
]
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

const photos = ref<PhotoItem[]>([])
const selectedId = ref<number | null>(null)
const variant = ref<PhotoVariant>('original')
const urls = ref<Record<string, string>>({})
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const uploading = ref(false)
const enhancing = ref<PhotoPreset | null>(null)
const deleteOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
let request = 0

const selected = computed(() => photos.value.find((p) => p.id === selectedId.value) || null)
const previewUrl = computed(() => (selected.value ? urls.value[key(selected.value.id, variant.value)] : ''))

function key(id: number, v: PhotoVariant) {
  return `${id}:${v}`
}

function revokeAll() {
  Object.values(urls.value).forEach((u) => URL.revokeObjectURL(u))
  urls.value = {}
}

function revokePhoto(id: number, v?: PhotoVariant) {
  for (const each of v ? [v] : (['original', 'enhanced'] as PhotoVariant[])) {
    const k = key(id, each)
    if (urls.value[k]) {
      URL.revokeObjectURL(urls.value[k])
      const next = { ...urls.value }
      delete next[k]
      urls.value = next
    }
  }
}

async function fetchUrl(id: number, v: PhotoVariant, seq: number) {
  const k = key(id, v)
  if (urls.value[k]) return
  try {
    const blob = (await photosApi.content(props.vehicleId, id, v)).data
    if (seq !== request) return
    urls.value = { ...urls.value, [k]: URL.createObjectURL(blob) }
  } catch {
    if (seq === request) actionError.value = 'Could not load a photo.'
  }
}

async function load() {
  const seq = ++request
  revokeAll()
  photos.value = []
  selectedId.value = null
  loadError.value = ''
  actionError.value = ''
  loading.value = true
  try {
    const items = (await photosApi.list(props.vehicleId)).data
    if (seq !== request) return
    photos.value = items
    selectedId.value = items[0]?.id ?? null
    variant.value = items[0]?.enhancement ? 'enhanced' : 'original'
    await Promise.all(items.map((p) => fetchUrl(p.id, 'original', seq)))
  } catch {
    if (seq === request) loadError.value = 'Could not load photos.'
  } finally {
    if (seq === request) loading.value = false
  }
}

function select(photo: PhotoItem) {
  selectedId.value = photo.id
  variant.value = photo.enhancement ? 'enhanced' : 'original'
}

function pickFile() {
  actionError.value = ''
  fileInput.value?.click()
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!ACCEPTED_TYPES.includes(file.type)) {
    actionError.value = 'Photo must be a JPEG or PNG image.'
    return
  }
  if (file.size > PHOTO_MAX_BYTES) {
    actionError.value = 'Photo must be 2 MB or smaller.'
    return
  }
  uploading.value = true
  actionError.value = ''
  const seq = request
  try {
    const saved = (await photosApi.upload(props.vehicleId, file)).data
    if (seq !== request) return
    photos.value = [...photos.value, saved]
    selectedId.value = saved.id
    variant.value = 'original'
    await fetchUrl(saved.id, 'original', seq)
  } catch (e) {
    if (seq !== request) return
    actionError.value = codeOf(e) === 'UNSUPPORTED_MEDIA_TYPE'
      ? 'Photo must be a JPEG or PNG image.'
      : messageOf(e, 'Could not upload photo.')
  } finally {
    uploading.value = false
  }
}

async function enhance(preset: PhotoPreset) {
  const photo = selected.value
  if (!photo) return
  enhancing.value = preset
  actionError.value = ''
  const seq = request
  try {
    const saved = (await photosApi.enhance(props.vehicleId, photo.id, preset)).data
    if (seq !== request) return
    photos.value = photos.value.map((p) => (p.id === saved.id ? saved : p))
    revokePhoto(saved.id, 'enhanced')
    variant.value = 'enhanced'
    await fetchUrl(saved.id, 'enhanced', seq)
  } catch (e) {
    if (seq === request) actionError.value = messageOf(e, 'Could not enhance photo.')
  } finally {
    enhancing.value = null
  }
}

async function remove() {
  const photo = selected.value
  deleteOpen.value = false
  if (!photo) return
  actionError.value = ''
  const seq = request
  try {
    await photosApi.remove(props.vehicleId, photo.id)
    if (seq !== request) return
    revokePhoto(photo.id)
    photos.value = photos.value.filter((p) => p.id !== photo.id)
    const next = photos.value[0]
    if (next) select(next)
    else selectedId.value = null
  } catch (e) {
    if (seq === request) actionError.value = messageOf(e, 'Could not delete photo.')
  }
}

watch(
  () => [selected.value?.id, variant.value] as const,
  ([id, v]) => {
    if (id != null) void fetchUrl(id, v, request)
  },
)
watch(() => props.vehicleId, load, { immediate: true })
onBeforeUnmount(() => {
  request++
  revokeAll()
})
</script>

<template>
  <div class="photo-studio">
    <div class="photo-studio-head">
      <span class="muted">Image Studio</span>
      <el-button size="small" :loading="uploading" @click="pickFile">Upload photo</el-button>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png" hidden @change="upload" />
    </div>
    <p v-if="loadError" class="danger-text">{{ loadError }}</p>
    <div v-loading="loading">
      <p v-if="!loading && !loadError && !photos.length" class="muted">No photos yet. JPEG or PNG, up to 2 MB.</p>
      <template v-if="selected">
        <div class="photo-studio-preview">
          <img v-if="previewUrl" :src="previewUrl" :alt="`Vehicle photo ${selected.id} (${variant})`" />
          <span v-else class="muted">Loading…</span>
        </div>
        <div class="photo-studio-tools">
          <el-radio-group v-model="variant" size="small">
            <el-radio-button value="original">Original</el-radio-button>
            <el-radio-button value="enhanced" :disabled="!selected.enhancement">Enhanced</el-radio-button>
          </el-radio-group>
          <el-button
            v-for="preset in PRESETS"
            :key="preset.value"
            size="small"
            :type="selected.enhancement === preset.value ? 'primary' : 'default'"
            :loading="enhancing === preset.value"
            :disabled="!!enhancing"
            @click="enhance(preset.value)"
          >{{ preset.label }}</el-button>
          <el-button size="small" type="danger" link @click="deleteOpen = true">Delete</el-button>
        </div>
      </template>
      <div v-if="photos.length" class="photo-studio-strip">
        <button
          v-for="photo in photos"
          :key="photo.id"
          type="button"
          :class="['photo-studio-thumb', { active: photo.id === selectedId }]"
          :aria-label="`Show photo ${photo.id}`"
          @click="select(photo)"
        >
          <img v-if="urls[key(photo.id, 'original')]" :src="urls[key(photo.id, 'original')]" alt="" />
        </button>
      </div>
    </div>
    <p v-if="actionError" class="danger-text">{{ actionError }}</p>
    <ConfirmDialog
      :visible="deleteOpen"
      title="Delete photo"
      message="Delete this photo and its enhanced copy?"
      confirm-label="Delete"
      @cancel="deleteOpen = false"
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.photo-studio { margin-top: 24px; }
.photo-studio-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.photo-studio-preview {
  display: grid; place-items: center; min-height: 180px; border: 1px solid var(--border);
  border-radius: 12px; background: var(--surface); overflow: hidden;
}
.photo-studio-preview img { display: block; max-width: 100%; max-height: 320px; object-fit: contain; }
.photo-studio-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0; }
.photo-studio-tools .el-button + .el-button { margin-left: 0; }
.photo-studio-strip { display: flex; flex-wrap: wrap; gap: 8px; }
.photo-studio-thumb {
  width: 64px; height: 48px; padding: 0; border: 2px solid transparent; border-radius: 8px;
  overflow: hidden; background: var(--surface); cursor: pointer;
}
.photo-studio-thumb.active { border-color: var(--accent); }
.photo-studio-thumb img { width: 100%; height: 100%; object-fit: cover; }
</style>
