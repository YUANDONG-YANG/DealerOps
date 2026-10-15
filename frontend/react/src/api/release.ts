import { http } from './http';

export type ReleaseTimes = { web: string; gateway: string; core: string; ai: string };

const UNAVAILABLE = 'unavailable';

export async function getReleaseTimes(): Promise<ReleaseTimes> {
  const r = await http.get<Partial<ReleaseTimes>>('/actuator/release');
  return {
    web: r.data?.web || UNAVAILABLE,
    gateway: r.data?.gateway || UNAVAILABLE,
    core: r.data?.core || UNAVAILABLE,
    ai: r.data?.ai || UNAVAILABLE,
  };
}
