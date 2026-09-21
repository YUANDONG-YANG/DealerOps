import axios from 'axios'
import { accessToken } from '../auth/msal'
export const http=axios.create({baseURL:import.meta.env.VITE_GATEWAY_URL||'http://localhost:8080',headers:{'Content-Type':'application/json'}})
http.interceptors.request.use(async config=>{config.headers= config.headers||{}; config.headers.Authorization=`Bearer ${await accessToken()}`; return config})
http.interceptors.response.use(r=>r,err=>{if(err.response?.status===401){window.location.assign('/login')} return Promise.reject(err)})
export function messageOf(error:unknown,fallback='Request failed.'){const e=error as {response?:{data?:{message?:string}}};return e.response?.data?.message||fallback}
