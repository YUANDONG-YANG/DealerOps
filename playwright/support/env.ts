// Every value can be overridden through the environment. The defaults target the private stack
// started by scripts/e2e-stack.sh (its own database), so test data never lands in the shared
// development database; the account defaults are local-only and never valid elsewhere.
const webUrl = (process.env.E2E_WEB_URL ?? 'http://localhost:5175').replace(/\/$/, '');
const gatewayUrl = (process.env.E2E_GATEWAY_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');

function isLocalUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url);
}

export type Account = { username: string; displayName: string; email: string; password: string };

export type SeedDealer = {
  legalName: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  staff: Account[];
};

const staffPassword = process.env.E2E_STAFF_PASSWORD ?? 'e2e-staff-pass-1';

function staff(username: string, displayName: string): Account {
  return { username, displayName, email: `${username}@example.com`, password: staffPassword };
}

// Dealer A has two staff (shared-data checks, AUTH-06); dealer B exists for isolation checks.
const dealerA: SeedDealer = {
  legalName: process.env.E2E_DEALER_NAME ?? 'E2E Motors',
  contactPhone: '403-555-0199',
  contactEmail: 'e2e.dealer@example.com',
  contactAddress: '1 Test Street, Calgary, AB',
  staff: [staff(process.env.E2E_STAFF_USER ?? 'e2e.staff', 'E2E Staff'), staff('e2e.staff2', 'E2E Staff Two')],
};

const dealerB: SeedDealer = {
  legalName: 'E2E Rival Autos',
  contactPhone: '403-555-0288',
  contactEmail: 'e2e.rival@example.com',
  contactAddress: '2 Other Road, Calgary, AB',
  staff: [staff('e2e.rival', 'E2E Rival Staff')],
};

export const env = {
  webUrl,
  gatewayUrl,
  isLocal: isLocalUrl(webUrl) && isLocalUrl(gatewayUrl),
  // Seeding writes dealerships and staff accounts; remote targets must opt in.
  allowRemoteSeed: process.env.E2E_ALLOW_REMOTE_SEED === '1',
  admin: {
    identifier: process.env.E2E_ADMIN_USER ?? 'admin',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'admin123',
  },
  staffPassword,
  dealers: [dealerA, dealerB],
  dealerA,
  dealerB,
  dealerName: dealerA.legalName,
  staff: dealerA.staff[0],
  staff2: dealerA.staff[1],
  rival: dealerB.staff[0],
};
