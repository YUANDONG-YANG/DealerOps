import { http } from './http';

export type ReleaseTimes = { web: string; gateway: string; core: string; ai: string };

const UNAVAILABLE = 'unavailable';

/**
 * Publish times reported by the gateway. A missing field is shown as `unavailable`.
 *
 * @returns web, gateway, core, and ai timestamps
 */
export async function getReleaseTimes(): Promise<ReleaseTimes> {
  const r = await http.get<Partial<ReleaseTimes>>('/actuator/release');
  return {
    web: r.data?.web || UNAVAILABLE,
    gateway: r.data?.gateway || UNAVAILABLE,
    core: r.data?.core || UNAVAILABLE,
    ai: r.data?.ai || UNAVAILABLE,
  };
}
