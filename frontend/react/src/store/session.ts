import { create } from 'zustand';

export type Role = 'Platform.Admin' | 'Dealer.User' | null;

interface SessionState {
  role: Role;
  dealerId: number | null;
  dealerLegalName: string | null;
  dealerContactPhone: string | null;
  dealerContactEmail: string | null;
  dealerContactAddress: string | null;
  dealerLogoDataUrl: string | null;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  hasBusinessAccess: boolean;
  setProfile: (p: Record<string, unknown>) => void;
  clear: () => void;
}

function computeAccess(role: Role, dealerId: number | null): boolean {
  return role === 'Platform.Admin' || (role === 'Dealer.User' && dealerId !== null);
}

export function hasBusinessAccess(s: Pick<SessionState, 'role' | 'dealerId'>): boolean {
  return computeAccess(s.role, s.dealerId);
}

export const useSessionStore = create<SessionState>((set) => ({
  role: null,
  dealerId: null,
  dealerLegalName: null,
  dealerContactPhone: null,
  dealerContactEmail: null,
  dealerContactAddress: null,
  dealerLogoDataUrl: null,
  displayName: '',
  username: '',
  avatarUrl: null,
  hasBusinessAccess: false,
  setProfile: (p) => {
    const role = (p.role as Role) ?? null;
    const dealerId = p.active === false ? null : ((p.dealerId as number) ?? null);
    set({
      role,
      dealerId,
      dealerLegalName: (p.dealerLegalName as string) ?? null,
      dealerContactPhone: (p.dealerContactPhone as string) ?? null,
      dealerContactEmail: (p.dealerContactEmail as string) ?? null,
      dealerContactAddress: (p.dealerContactAddress as string) ?? null,
      dealerLogoDataUrl: (p.dealerLogoDataUrl as string) ?? null,
      displayName: (p.displayName as string) ?? '',
      username: (p.username as string) ?? '',
      avatarUrl: (p.avatarUrl as string) ?? null,
      hasBusinessAccess: computeAccess(role, dealerId),
    });
  },
  clear: () =>
    set({
      role: null,
      dealerId: null,
      dealerLegalName: null,
      dealerContactPhone: null,
      dealerContactEmail: null,
      dealerContactAddress: null,
      dealerLogoDataUrl: null,
      displayName: '',
      username: '',
      avatarUrl: null,
      hasBusinessAccess: false,
    }),
}));
