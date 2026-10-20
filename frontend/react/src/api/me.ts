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
};

export type PatchProfileBody = { displayName: string; phone?: string | null };

export async function getMe() {
  return (await http.get<Profile>('/api/v1/me')).data;
}

export async function patchMe(body: PatchProfileBody) {
  return (await http.patch<Profile>('/api/v1/me', body)).data;
}

export async function deleteMe() {
  await http.delete('/api/v1/me');
}

export type MyJoinRequest = { dealerId: number; legalName: string | null };

export async function myJoinRequest(): Promise<MyJoinRequest | null> {
  const response = await http.get<MyJoinRequest>('/api/v1/me/join-request', {
    validateStatus: (status) => status === 200 || status === 204,
  });
  return response.status === 204 ? null : response.data;
}

export async function fileJoinRequest(dealerId: number) {
  return (await http.post<MyJoinRequest>('/api/v1/me/join-request', { dealerId })).data;
}
