import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import axios from 'axios'
import {
  account,
  clearAccount,
  rememberPostLoginRedirect,
  safeRedirect,
  takePostLoginRedirect,
} from '../auth/login'
import { getMe } from '../api/me'
import { useSessionStore } from '../stores/session'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminView from '../views/AdminView.vue'
import DmsView from '../views/DmsView.vue'
import CrmView from '../views/CrmView.vue'
import LeadsView from '../views/LeadsView.vue'
import AdsView from '../views/AdsView.vue'
import NoAccessLanding from '../layouts/NoAccessLanding.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { public: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { roles: ['Platform.Admin'] } },
  { path: '/dms', name: 'dms', component: DmsView, meta: { roles: ['Dealer.User'] } },
  { path: '/crm', name: 'crm', component: CrmView, meta: { roles: ['Dealer.User'] } },
  { path: '/leads', name: 'leads', component: LeadsView, meta: { roles: ['Dealer.User'] } },
  { path: '/ads', name: 'ads', component: AdsView, meta: { roles: ['Dealer.User'] } },
  { path: '/', name: 'home', component: LandingView, meta: { public: true } },
  { path: '/no-access', name: 'no-access', component: NoAccessLanding },
  { path: '/:pathMatch(.*)*', name: 'fallback', component: NoAccessLanding },
]

const router = createRouter({ history: createWebHistory(), routes })

let profileFailed = false

function isNoAccess(to: RouteLocationNormalized) {
  return to.name === 'no-access' || to.name === 'fallback'
}

function landingFor(store: ReturnType<typeof useSessionStore>) {
  if (store.role === 'Platform.Admin') return '/admin'
  if (store.hasBusinessAccess) return '/dms'
  return '/no-access'
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

  // After a failed GET /me, skip the retry only on /login so the redirect there cannot loop;
  // the next protected navigation (for example a fresh sign-in) tries again.
  if (a && !store.role && !(profileFailed && to.path === '/login')) {
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

  if ((to.path === '/login' || to.path === '/register') && a) {
    if (profileFailed) return to.path === '/login' ? true : '/login'
    if (!store.hasBusinessAccess) return '/no-access'
    const fromQuery = typeof to.query.redirect === 'string' ? safeRedirect(to.query.redirect) : ''
    return fromQuery || takePostLoginRedirect() || landingFor(store)
  }

  // The public landing page is for visitors; a signed-in user goes to their own landing.
  if (to.name === 'home' && a) return landingFor(store)

  if (isNoAccess(to)) {
    if (!a) return '/login'
    if (store.hasBusinessAccess) return landingFor(store)
    return true
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(store.role || '')) {
    if (store.hasBusinessAccess) return landingFor(store)
    return '/no-access'
  }

  if (a && (!knownRole(store) || !store.hasBusinessAccess) && !to.meta.public) {
    return '/no-access'
  }

  return true
})

export default router
