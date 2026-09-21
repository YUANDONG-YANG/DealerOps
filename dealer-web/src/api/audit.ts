import { http } from './http'
export const auditApi={list:(p:any)=>http.get('/api/v1/audit',{params:p})}
