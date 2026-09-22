import { http } from './http'

export type AssistantCardKind = 'VEHICLE' | 'CUSTOMER' | 'LISTING'

export type AssistantCardDto = {
  kind: AssistantCardKind
  id: number
  label: string
  status?: string
  vehicleId?: number
  checkStatus?: string
}

export type AskResponse = {
  summary: string | null
  summaryAvailable: boolean
  cards: AssistantCardDto[]
}

export const assistantApi = {
  ask: (text: string) => http.post<AskResponse>('/api/v1/assistant/ask', { text }),
}
