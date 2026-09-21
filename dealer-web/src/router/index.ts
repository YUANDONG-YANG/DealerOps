import { createRouter,createWebHistory } from 'vue-router'
import { account } from '../auth/msal'
import { useSessionStore } from '../stores/session'
import { getMe } from '../api/me'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import DmsView from '../views/DmsView.vue'
import CrmView from '../views/CrmView.vue'
import AdsView from '../views/AdsView.vue'
import AssistantView from '../views/AssistantView.vue'
const routes=[{path:'/login',name:'login',component:LoginView,meta:{public:true}},{path:'/admin',name:'admin',component:AdminView,meta:{roles:['Platform.Admin']}},{path:'/dms',name:'dms',component:DmsView,meta:{roles:['Dealer.User']}},{path:'/crm',name:'crm',component:CrmView,meta:{roles:['Dealer.User']}},{path:'/ads',name:'ads',component:AdsView,meta:{roles:['Dealer.User']}},{path:'/assistant',name:'assistant',component:AssistantView,meta:{roles:['Dealer.User']}},{path:'/:pathMatch(.*)*',redirect:'/login'}]
const router=createRouter({history:createWebHistory(),routes})
router.beforeEach(async(to)=>{const store=useSessionStore(); const a=account(); store.account=a||null; if(!a&&!to.meta.public)return {path:'/login',query:{redirect:to.fullPath}}; if(a&&!store.role){try{store.setProfile(await getMe())}catch{store.clear();return '/login'}} if(to.path==='/login'&&store.role)return store.role==='Platform.Admin'?'/admin':'/dms'; const roles=to.meta.roles as string[]|undefined;if(roles&&!roles.includes(store.role||'')){return store.role==='Platform.Admin'?'/admin':store.role==='Dealer.User'?'/dms':'/login'} return true})
export default router
