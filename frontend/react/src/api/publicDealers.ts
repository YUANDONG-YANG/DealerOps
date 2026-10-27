import axios from 'axios';
import { logApiFailure } from './apiFailure';
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
 * Dealerships a visitor can browse or ask to join, before a token exists.
 * This skips the authenticated http client. Logo URLs are filled in on the client from `hasLogo`.
 *
 * @returns public rows; `logoUrl` is null when the dealership has no logo
 */
export async function listPublicDealers(): Promise<PublicDealer[]> {
  const route = 'GET /api/v1/catalog/dealers';
  try {
    const baseURL = await resolveGatewayUrl();
    const { data } = await axios.get<PublicDealer[]>(`${baseURL}/api/v1/catalog/dealers`);
    return data.map(d => ({ ...d, logoUrl: d.hasLogo ? `${baseURL}/api/v1/public/dealers/${d.id}/logo` : null }));
  } catch (error) {
    logApiFailure(error, route);
    throw error;
  }
}
