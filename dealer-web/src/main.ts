import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles.css'
import App from './App.vue'
import router from './router'
import { initializeMsal } from './auth/msal'
import { applyGatewayUrl } from './api/http'

void applyGatewayUrl()
  .then(() => initializeMsal())
  .finally(() => {
    createApp(App).use(createPinia()).use(ElementPlus).use(router).mount('#app')
  })
