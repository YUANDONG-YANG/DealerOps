import axios from 'axios';
import { logApiFailure } from './apiFailure';
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
  /**
   * One dealership's public inventory.
   *
   * @param dealer slug from `/shop/{slug}`, or a numeric id from an older link
   * @returns inventory with photo URLs filled in on the client
   */
  async inventory(dealer: string): Promise<PublicInventory> {
    const route = `GET /api/v1/public/dealers/${encodeURIComponent(dealer)}/inventory`;
    try {
      const gateway = `${await resolveGatewayUrl()}/api/v1/public/dealers`;
      const data = (await axios.get<PublicInventory>(`${gateway}/${encodeURIComponent(dealer)}/inventory`)).data;
      const base = `${gateway}/${data.dealerId}`;
      return {
        ...data,
        vehicles: data.vehicles.map(v => ({ ...v, photoUrl: v.hasPhoto ? `${base}/vehicles/${v.vehicleId}/photo` : null })),
      };
    } catch (error) {
      logApiFailure(error, route);
      throw error;
    }
  },
  /**
   * Files a buyer question as a new lead. The contact fields are not logged.
   *
   * @param dealerId dealership that owns the vehicle
   * @param body vehicle, contact, and message
   */
  async inquire(dealerId: number, body: InquiryBody): Promise<void> {
    const route = `POST /api/v1/public/dealers/${dealerId}/inquiries`;
    try {
      const baseURL = await resolveGatewayUrl();
      await axios.post(`${baseURL}/api/v1/public/dealers/${dealerId}/inquiries`, body);
    } catch (error) {
      logApiFailure(error, route);
      throw error;
    }
  },
};
