import axios from 'axios';
import { resolveGatewayUrl } from './gateway';

/**
 * `slug` names the dealership in the buyer-site URL (`/shop/{slug}`). `logoUrl` is added by the
 * client from `hasLogo`: the public logo route on the gateway, or null when there is no logo.
 */
export type PublicDealer = {
  id: number; legalName: string; slug: string; hasLogo: boolean; logoUrl: string | null;
  /** Vehicles in stock and sold so far, deleted vehicles excluded. */
  inStockCount: number; soldCount: number;
};

/**
 * Public dealer directory used by the Google sign-in "pick your dealership" step. Deliberately
 * does not go through the authenticated http client (http.ts) because it runs before the user
 * has a token.
 */
export async function listPublicDealers(): Promise<PublicDealer[]> {
  const baseURL = await resolveGatewayUrl();
  const { data } = await axios.get<PublicDealer[]>(`${baseURL}/api/v1/catalog/dealers`);
  return data.map(d => ({ ...d, logoUrl: d.hasLogo ? `${baseURL}/api/v1/public/dealers/${d.id}/logo` : null }));
}
