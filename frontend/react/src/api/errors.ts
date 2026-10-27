import { apiError } from './http';

// User-facing explanation for every server error code: what went wrong and what to do next.
// Codes whose server message is already specific (it names the field or record) keep it.
const REASONS: Record<string, string> = {
  VALIDATION: 'Some fields are missing or invalid. Check the messages under each field.',
  VIN_DUP: 'A vehicle with this VIN is already in your inventory. Search for it in DMS instead of adding it again.',
  SOLD_PAIR_REQUIRED: 'Enter both the sale date and the sale price.',
  WRONG_DEALER_OR_SOLD: 'This vehicle is sold or is not in your dealership\'s inventory. Refresh the list and pick another vehicle.',
  UNAUTHORIZED: 'Your session has expired. Sign in again to continue.',
  FORBIDDEN: 'Your account does not have access to this. Ask the platform admin to check your dealership access.',
  NOT_FOUND: 'This record no longer exists. It may have been deleted by a colleague. Refresh the page.',
  METHOD_NOT_ALLOWED: 'This action is not supported here. Refresh the page and try again.',
  VERSION_CONFLICT: 'Someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.',
  DUP_MEMBER: 'This login already belongs to a dealership. A login can belong to only one dealership.',
  USERNAME_TAKEN: 'That username is already in use. Choose another one.',
  DISPLAY_NAME_TAKEN: 'Another account already uses that name. Add a middle initial or a surname.',
  EMAIL_TAKEN: 'That email address is already used by another account. Use a different email.',
  PHONE_TAKEN: 'That phone number is already used by another account. Use a different number.',
  VEHICLE_ALREADY_LINKED: 'This vehicle is already linked to another customer. Unlink it from that customer first.',
  SOLD_LOCKED: 'This vehicle is sold, so its purchase details and ad can no longer be changed.',
  CHECK_STALE: 'The ad was edited after its last compliance check. Run the check again.',
  NOT_PASSED: 'The ad has not passed its latest compliance check. Fix the findings and run the check again.',
  LEAD_CLOSED: 'This lead is closed (won or lost) and can no longer be changed.',
  WORK_ORDER_CLOSED: 'This work order is already done or cancelled and can no longer be changed.',
  WORK_ORDERS_OPEN: 'This vehicle still has open work orders. Complete or cancel them first.',
  UNSUPPORTED_MEDIA_TYPE: 'That file type is not supported. Use a JPEG, PNG or WebP image.',
  INTERNAL_ERROR: 'The server ran into an unexpected problem. Try again; if it keeps happening, report the reference below.',
  AI_UNAVAILABLE: 'The AI service is not responding right now. Try again in a minute.',
  CATALOG_UNAVAILABLE: 'The vehicle catalog service is not responding. Try again, or type the make and model yourself.',
  RATE_LIMITED: 'Too many requests in a short time. Wait a minute and try again.',
};

const SPECIFIC_SERVER_MESSAGE = new Set([
  'VALIDATION', 'DUP_MEMBER', 'USERNAME_TAKEN', 'DISPLAY_NAME_TAKEN', 'EMAIL_TAKEN', 'PHONE_TAKEN',
]);

const BY_STATUS: Record<number, string> = {
  400: 'The request was not accepted. Check the form and try again.',
  401: REASONS.UNAUTHORIZED,
  403: REASONS.FORBIDDEN,
  404: REASONS.NOT_FOUND,
  409: 'This conflicts with the current data. Refresh the page and try again.',
  413: 'The file is too large. Use a smaller file.',
  415: REASONS.UNSUPPORTED_MEDIA_TYPE,
  429: 'Too many requests in a short time. Wait a moment and try again.',
};

function requestIdOf(error: unknown): string | undefined {
  const response = (error as { response?: { data?: { requestId?: unknown }; headers?: Record<string, unknown> } }).response;
  const id = response?.data && typeof response.data === 'object' ? response.data.requestId : undefined;
  const header = response?.headers?.['x-request-id'];
  const value = id ?? header;
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Why a request failed, phrased for the user, with what to do next.
 * The diagnostic line for the same error is written by `logApiFailure`.
 *
 * @param error rejection from the gateway client
 * @returns user-facing reason; codes that name a field or record keep the server message
 */
export function errorReason(error: unknown): string {
  const response = (error as { response?: unknown }).response;
  if (!response) {
    const timedOut = (error as { code?: string }).code === 'ECONNABORTED';
    return timedOut
      ? 'The server took too long to respond. Check your connection and try again.'
      : 'Cannot reach the server. Check your internet connection, then try again.';
  }
  const { status = 0, code, message } = apiError(error);
  if (code && SPECIFIC_SERVER_MESSAGE.has(code) && message) return message;
  let reason = (code && REASONS[code]) || BY_STATUS[status] || message
    || (status >= 500 ? REASONS.INTERNAL_ERROR : 'Something went wrong. Try again.');
  if (status >= 500) {
    const ref = requestIdOf(error);
    if (ref) reason += ` (Reference: ${ref})`;
  }
  return reason;
}

/**
 * "Could not <action>. <reason>" — keeps the action the user tried next to the cause.
 *
 * @param error rejection from the gateway client
 * @param action what the user tried, without a leading "Could not"
 * @returns the action plus the reason, or the reason alone when no action is given
 */
export function describeError(error: unknown, action?: string): string {
  return action ? `Could not ${action}. ${errorReason(error)}` : errorReason(error);
}
