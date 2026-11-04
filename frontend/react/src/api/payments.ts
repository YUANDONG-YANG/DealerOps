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

/** Payments recorded against a sold vehicle. Any member records rows; the owner and managers can also read and remove them. */
export const paymentsApi = {
  ledger: (vehicleId: number) => http.get<PaymentLedger>(`/api/v1/vehicles/${vehicleId}/payments`),
  /** The owner and managers get the updated ledger back; a sales member gets only the recorded payment (PAY-05). */
  create: (vehicleId: number, body: CreatePaymentBody) =>
    http.post<PaymentLedger | PaymentItem>(`/api/v1/vehicles/${vehicleId}/payments`, body),
  delete: (vehicleId: number, paymentId: number) =>
    http.delete<PaymentLedger>(`/api/v1/vehicles/${vehicleId}/payments/${paymentId}`),
};
