import { http } from './http';

export type Profile = {
  username: string; displayName: string; role: 'Platform.Admin' | 'Dealer.User';
  dealerId: number | null; dealerLegalName: string | null;
  dealerContactPhone: string | null; dealerContactEmail: string | null;
  dealerContactAddress: string | null; dealerLogoDataUrl: string | null;
  email: string | null; phone: string | null;
  /** "google" when the account was provisioned without a password, "password" otherwise. */
  signInMethod: 'google' | 'password';
  /** Extra identity bits lifted from the Google ID token; all null for password accounts. */
  givenName: string | null; familyName: string | null;
  avatarUrl: string | null; locale: string | null;
  /** Role inside the bound dealership; null for the admin and unbound accounts. */
  dealerRole: DealerRole | null;
};

export type DealerRole = 'MANAGER' | 'STAFF';

export type PatchProfileBody = { displayName: string; phone?: string | null };

/**
 * Signed-in profile, including the dealership binding the route guard uses.
 *
 * @returns profile from `GET /api/v1/me`
 */
export async function getMe() {
  return (await http.get<Profile>('/api/v1/me')).data;
}

/**
 * Updates the signed-in user's display name and phone. Username, role, and dealership stay unchanged.
 *
 * @param body display name and optional phone
 * @returns the profile after the change
 */
export async function patchMe(body: PatchProfileBody) {
  return (await http.patch<Profile>('/api/v1/me', body)).data;
}

/**
 * Deletes the signed-in account. The caller clears the local session afterwards.
 */
export async function deleteMe() {
  await http.delete('/api/v1/me');
}

export type MyJoinRequest = { dealerId: number; legalName: string | null };

/**
 * The caller's open request to join a dealership.
 *
 * @returns the request, or null when the server answers 204
 */
export async function myJoinRequest(): Promise<MyJoinRequest | null> {
  const response = await http.get<MyJoinRequest>('/api/v1/me/join-request', {
    validateStatus: (status) => status === 200 || status === 204,
  });
  return response.status === 204 ? null : response.data;
}

/**
 * Asks one dealership to approve this account (AUTH-25).
 *
 * @param dealerId dealership chosen from the public directory
 * @returns the stored request
 */
export async function fileJoinRequest(dealerId: number) {
  return (await http.post<MyJoinRequest>('/api/v1/me/join-request', { dealerId })).data;
}
