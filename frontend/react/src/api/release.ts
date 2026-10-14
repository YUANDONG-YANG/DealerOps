import { http } from './http';

export type ReleaseTimes = { gateway: string; core: string; ai: string };

export async function getReleaseTimes(): Promise<ReleaseTimes> {
  const [gw, core, ai] = await Promise.allSettled([
    http.get('/api/v1/release').then((r) => r.data?.publishedAt ?? 'unknown'),
    http.get('/api/v1/release/core').then((r) => r.data?.publishedAt ?? 'unknown'),
    http.get('/api/v1/release/ai').then((r) => r.data?.publishedAt ?? 'unknown'),
  ]);
  return {
    gateway: gw.status === 'fulfilled' ? gw.value : 'unavailable',
    core: core.status === 'fulfilled' ? core.value : 'unavailable',
    ai: ai.status === 'fulfilled' ? ai.value : 'unavailable',
  };
}
