import { http } from './http';

export const PAYMENT_METHODS = ['CASH', 'DEBIT', 'CREDIT_CARD', 'CHEQUE', 'BANK_TRANSFER', 'FINANCING', 'OTHER'] as const;

export interface PaymentItem {
  id: number;
  amount: number;
  method: string;
  paidOn: string;
  note: string | null;
  recordedBy: string;
  createdAt: string;
}

/** Payments received for a sold vehicle; balanceDue is soldPrice − paidTotal. */
export interface PaymentLedger {
  soldPrice: number | null;
  paidTotal: number;
  balanceDue: number | null;
  items: PaymentItem[];
}

export type CreatePaymentBody = { amount: number; method: string; paidOn: string; note: string | null };

export const paymentsApi = {
  ledger: (vehicleId: number) => http.get<PaymentLedger>(`/api/v1/vehicles/${vehicleId}/payments`),
  create: (vehicleId: number, body: CreatePaymentBody) =>
    http.post<PaymentLedger>(`/api/v1/vehicles/${vehicleId}/payments`, body),
  delete: (vehicleId: number, paymentId: number) =>
    http.delete<PaymentLedger>(`/api/v1/vehicles/${vehicleId}/payments/${paymentId}`),
};
