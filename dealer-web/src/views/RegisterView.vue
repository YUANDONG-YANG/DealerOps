<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { apiError, fieldErrorsOf } from '../api/http'
import { register } from '../auth/login'
import PhoneInput from '../components/PhoneInput.vue'

type Field = 'username' | 'displayName' | 'email' | 'phone' | 'password'

const router = useRouter()
const formRef = ref<FormInstance>()
const form = reactive<Record<Field, string>>({ username: '', displayName: '', email: '', phone: '', password: '' })
const serverErrors = reactive<Partial<Record<Field, string>>>({})
const error = ref('')
const loading = ref(false)

// Conflict codes from POST /api/v1/auth/register and the field each one belongs to (design/21-Feature-Extensions.md AUTH-16).
const TAKEN_FIELD: Record<string, Field> = {
  USERNAME_TAKEN: 'username',
  DISPLAY_NAME_TAKEN: 'displayName',
  EMAIL_TAKEN: 'email',
  PHONE_TAKEN: 'phone',
}

const PHONE = /^\+?[1-9][0-9]{6,14}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const emailOrPhone: FormItemRule['validator'] = (_rule, _value, callback) => {
  callback(!form.email.trim() && !form.phone.trim() ? new Error('Enter an email address or a phone number.') : undefined)
}

const rules: FormRules = {
  username: [
    { required: true, message: 'Enter a username.', trigger: 'blur' },
    { pattern: /^(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}$/, message: 'Use 3–64 letters, digits, dots, dashes or underscores, with at least one letter.', trigger: 'blur' },
  ],
  displayName: [
    { required: true, whitespace: true, message: 'Enter your full name.', trigger: 'blur' },
    { max: 120, message: 'Full name can be at most 120 characters.', trigger: 'blur' },
  ],
  email: [
    { validator: emailOrPhone, trigger: 'blur' },
    { validator: (_r, v: string, cb) => cb(v.trim() && !EMAIL.test(v.trim()) ? new Error('Enter a valid email address.') : undefined), trigger: 'blur' },
  ],
  phone: [
    { validator: emailOrPhone, trigger: 'blur' },
    {
      validator: (_r, v: string, cb) =>
        cb(v.trim() && !PHONE.test(v.trim().replace(/[\s().-]/g, '')) ? new Error('Enter a valid phone number for the selected country.') : undefined),
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: 'Enter a password.', trigger: 'blur' },
    { min: 8, max: 72, message: 'Password must be 8–72 characters.', trigger: 'blur' },
  ],
}

function clearServerErrors() {
  for (const key of Object.keys(serverErrors) as Field[]) delete serverErrors[key]
}

async function submit() {
  error.value = ''
  clearServerErrors()
  if (!(await formRef.value?.validate().catch(() => false))) return
  loading.value = true
  try {
    await register(form.username.trim(), form.displayName.trim(), form.email.trim(), form.phone.trim(), form.password)
    await router.push('/')
  } catch (e) {
    // Field-level problems go under their input; anything else shows the server's own message.
    const fields = fieldErrorsOf(e)
    const { code, message } = apiError(e)
    for (const [field, text] of Object.entries(fields)) if (field in form) serverErrors[field as Field] = text
    const taken = code ? TAKEN_FIELD[code] : undefined
    if (taken && !serverErrors[taken]) serverErrors[taken] = message || 'Already registered.'
    if (!Object.keys(serverErrors).length) error.value = message || 'Could not create the account. Try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <el-card class="auth-card">
      <div class="brand">Dealer Ops</div>
      <h1>Create account</h1>
      <p class="muted">An administrator adds your account to a dealership before you can use it.</p>
      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom:12px" />
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="submit">
        <el-form-item prop="username" :error="serverErrors.username">
          <el-input v-model="form.username" placeholder="Username" autocomplete="username" />
        </el-form-item>
        <el-form-item prop="displayName" :error="serverErrors.displayName">
          <el-input v-model="form.displayName" placeholder="Full name" autocomplete="name" />
        </el-form-item>
        <el-form-item prop="email" :error="serverErrors.email">
          <el-input v-model="form.email" type="email" placeholder="Email" autocomplete="email" @blur="formRef?.validateField('phone').catch(() => {})" />
        </el-form-item>
        <el-form-item prop="phone" :error="serverErrors.phone">
          <PhoneInput v-model="form.phone" placeholder="Phone (email, phone, or both)" @blur="formRef?.validateField('email').catch(() => {})" />
        </el-form-item>
        <el-form-item prop="password" :error="serverErrors.password">
          <el-input v-model="form.password" type="password" placeholder="Password (at least 8 characters)" autocomplete="new-password" show-password />
        </el-form-item>
        <el-button type="primary" native-type="submit" style="width:100%" :loading="loading">Create account</el-button>
      </el-form>
      <p class="auth-switch">Already have an account? <router-link to="/login">Sign in</router-link></p>
    </el-card>
  </div>
</template>

<style scoped>
.auth-switch { margin: 16px 0 0; text-align: center; color: var(--muted-fg); }
</style>
