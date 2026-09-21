import { defineStore } from 'pinia'
import type { AccountInfo } from '@azure/msal-browser'
export type Role='Platform.Admin'|'Dealer.User'|null
export const useSessionStore=defineStore('session',{state:()=>({account:null as AccountInfo|null,role:null as Role,dealerId:null as number|null,dealerLegalName:null as string|null,displayName:'',entraOid:''}),getters:{signedIn:s=>!!s.account,hasBusinessAccess:s=>s.role==='Platform.Admin'||(s.role==='Dealer.User'&&s.dealerId!==null)},actions:{setProfile(p:any){this.role=p.role;this.dealerId=p.dealerId??null;this.dealerLegalName=p.dealerLegalName??null;this.displayName=p.displayName??'';this.entraOid=p.entraOid??''},clear(){this.account=null;this.role=null;this.dealerId=null;this.dealerLegalName=null;this.displayName='';this.entraOid=''}}})
