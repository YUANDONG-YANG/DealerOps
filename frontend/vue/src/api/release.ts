import { applyGatewayUrl } from './http'

export type ReleaseTimes = { gateway: string; core: string; ai: string }

/** Release time of gateway, core and ai-service. Public on the gateway, so no token is sent. */
export async function getReleaseTimes(): Promise<ReleaseTimes> {
  const response = await fetch(`${await applyGatewayUrl()}/actuator/release`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`GET /actuator/release ${response.status}`)
  return (await response.json()) as ReleaseTimes
}
