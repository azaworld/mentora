export interface CheckoutInput {
  tranId: string;
  amountMinor: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  productName: string;
  productCategory: string;
  urls: { success: string; fail: string; cancel: string; ipn: string };
}

export type ValidationResult =
  | { ok: true; tranId: string; amountMinor: number; currency: string; providerRef: string }
  | { ok: false; tranId?: string; reason: string };

export interface PaymentProvider {
  id: "mock" | "sslcommerz";
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string }>;
  /** Confirms a payment with the gateway itself; never trusts the browser's callback alone. */
  validate(params: Record<string, string>): Promise<ValidationResult>;
}
