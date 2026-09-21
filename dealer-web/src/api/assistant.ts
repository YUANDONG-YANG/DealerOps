import { http } from './http'
export const assistantApi={ask:(text:string)=>http.post('/api/v1/assistant/ask',{text})}
