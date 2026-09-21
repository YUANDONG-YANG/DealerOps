import { http } from './http'
export const vehiclesApi={list:(p:any={})=>http.get('/api/v1/vehicles',{params:{...p,size:p.size??10}}),get:(id:number)=>http.get(`/api/v1/vehicles/${id}`),create:(b:any)=>http.post('/api/v1/vehicles',b),update:(id:number,b:any)=>http.patch(`/api/v1/vehicles/${id}`,b),sell:(id:number,b:any)=>http.post(`/api/v1/vehicles/${id}/sell`,b)}
