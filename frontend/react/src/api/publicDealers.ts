import axios from 'axios';
import { resolveGatewayUrl } from './gateway';

export type PublicDealer = { id: number; legalName: string };

/**
 * Public dealer directory used by the Google sign-in "pick your dealership" step. Deliberately
 * does not go through the authenticated http client (http.ts) because it runs before the user
 * has a token.
 */
export async function listPublicDealers(): Promise<PublicDealer[]> {
  const baseURL = await resolveGatewayUrl();
  const { data } = await axios.get<PublicDealer[]>(`${baseURL}/api/v1/catalog/dealers`);
  return data;
}
