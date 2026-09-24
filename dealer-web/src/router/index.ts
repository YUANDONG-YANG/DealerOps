import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import axios from 'axios'
import { account, clearAccount, rememberPostLoginRedirect, takePostLoginRedirect } from '../auth/msal'
import { getMe } from '../api/me'
import { useSessionStore } from '../stores/session'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import DmsView from '../views/DmsView.vue'
import CrmView from '../views/CrmView.vue'
import AdsView from '../views/AdsView.vue'
import AssistantView from '../views/AssistantView.vue'
import NoAccessLanding from '../layouts/NoAccessLanding.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { roles: ['Platform.Admin'] } },
  { path: '/dms', name: 'dms', component: DmsView, meta: { roles: ['Dealer.User'] } },
  { path: '/crm', name: 'crm', component: CrmView, meta: { roles: ['Dealer.User'] } },
  { path: '/ads', name: 'ads', component: AdsView, meta: { roles: ['Dealer.User'] } },
  { path: '/assistant', name: 'assistant', component: AssistantView, meta: { roles: ['Dealer.User'] } },
  { path: '/', name: 'home', component: NoAccessLanding },
  { path: '/:pathMatch(.*)*', name: 'fallback', component: NoAccessLanding },
]

const router = createRouter({ history: createWebHistory(), routes })

let profileFailed = false

function isLanding(to: RouteLocationNormalized) {
  return to.name === 'home' || to.name === 'fallback'
}

function landingFor(store: ReturnType<typeof useSessionStore>) {
  if (store.role === 'Platform.Admin') return '/admin'
  if (store.role === 'Dealer.User' && store.dealerId != null) return '/dms'
  return '/'
}

function hasBusinessAccess(store: ReturnType<typeof useSessionStore>) {
  return store.role === 'Platform.Admin' || (store.role === 'Dealer.User' && store.dealerId != null)
}

function knownRole(store: ReturnType<typeof useSessionStore>) {
  return store.role === 'Platform.Admin' || store.role === 'Dealer.User'
}

router.beforeEach(async (to) => {
  const store = useSessionStore()
  const a = account()
  store.account = a || null

  if (!a && !to.meta.public) {
    rememberPostLoginRedirect(to.fullPath)
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (!a) {
    profileFailed = false
  }

  if (a && !store.role && !profileFailed) {
    try {
      store.setProfile(await getMe())
      profileFailed = false
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        store.clear()
        await clearAccount()
        profileFailed = false
        if (to.path === '/login' && to.query.notice === 'required') return true
        return { path: '/login', query: { notice: 'required' } }
      }
      profileFailed = true
      if (to.path === '/login' && to.query.notice === 'profile') return true
      return { path: '/login', query: { ...to.query, notice: 'profile' } }
    }
  }

  if (to.path === '/login' && a) {
    if (profileFailed) return true
    if (!hasBusinessAccess(store)) return '/'
    const fromQuery = typeof to.query.redirect === 'string' ? to.query.redirect : ''
    const redirect = fromQuery || takePostLoginRedirect()
    if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')) {
      return redirect
    }
    return landingFor(store)
  }

  if (isLanding(to)) {
    if (!a) return '/login'
    if (hasBusinessAccess(store)) return landingFor(store)
    return true
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(store.role || '')) {
    if (hasBusinessAccess(store)) return landingFor(store)
    return '/'
  }

  if (a && (!knownRole(store) || !hasBusinessAccess(store)) && !to.meta.public) {
    return '/'
  }

  return true
})

export default router
