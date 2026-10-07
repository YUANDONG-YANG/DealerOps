import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import './styles.css'
import App from './App.vue'
import router from './router'
import { applyGatewayUrl } from './api/http'

let startupFailed = false

void applyGatewayUrl()
  .catch((error: unknown) => {
    startupFailed = true
    console.error(error)
  })
  .finally(() => {
    createApp(App).use(createPinia()).use(ElementPlus).use(router).mount('#app')
    if (startupFailed) {
      ElMessage.error('Sign-in could not start. Try again.')
    }
  })
