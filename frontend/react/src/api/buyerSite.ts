import axios from 'axios';
import { resolveGatewayUrl } from './gateway';

export type PublicVehicle = {
  vehicleId: number;
  modelYear: number;
  make: string;
  model: string;
  bodyType: string;
  conditionCode: string;
  mileageKm: number | null;
  exteriorColor: string | null;
  fuelType: string | null;
  title: string;
  body: string;
  hasPhoto: boolean;
  /** Added by the client from hasPhoto: the public photo route on the gateway. */
  photoUrl: string | null;
};

export type PublicInventory = {
  dealerId: number;
  /** The URL name used by `/shop/{slug}`. */
  slug: string;
  legalName: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  vehicles: PublicVehicle[];
};

export type InquiryBody = {
  vehicleId: number;
  contact: { name: string; email: string; phone: string; homeAddress: string };
  message: string;
};

/**
 * Anonymous buyer site. Like publicDealers.ts it skips the authenticated http client, because a
 * buyer has no token; the gateway lets only /api/v1/public/** through without one.
 */
export const buyerSiteApi = {
  /** `dealer` is the slug from the URL, or the numeric id of an older link. */
  async inventory(dealer: string): Promise<PublicInventory> {
    const gateway = `${await resolveGatewayUrl()}/api/v1/public/dealers`;
    const data = (await axios.get<PublicInventory>(`${gateway}/${encodeURIComponent(dealer)}/inventory`)).data;
    const base = `${gateway}/${data.dealerId}`;
    return {
      ...data,
      vehicles: data.vehicles.map(v => ({ ...v, photoUrl: v.hasPhoto ? `${base}/vehicles/${v.vehicleId}/photo` : null })),
    };
  },
  async inquire(dealerId: number, body: InquiryBody): Promise<void> {
    const baseURL = await resolveGatewayUrl();
    await axios.post(`${baseURL}/api/v1/public/dealers/${dealerId}/inquiries`, body);
  },
};
