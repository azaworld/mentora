import { sslcommerz } from "./sslcommerz";
import type { PaymentProvider } from "./types";

export type { CheckoutInput, PaymentProvider, ValidationResult } from "./types";

/** The test gateway is only available outside production unless explicitly allowed. */
export function mockPaymentsEnabled(): boolean {
  if (process.env.PAYMENT_PROVIDER !== "mock") return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true";
}

export function appUrl(): string {
  const url = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

const mock: PaymentProvider = {
  id: "mock",
  async createCheckout(input) {
    return { redirectUrl: `${appUrl()}/pay/mock/${encodeURIComponent(input.tranId)}` };
  },
  async validate() {
    return { ok: false, reason: "The test gateway is completed from its own page" };
  },
};

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  if (name === "sslcommerz") {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) throw new Error("SSLCommerz credentials are not configured");
    return sslcommerz({ storeId, storePassword, live: process.env.SSLCOMMERZ_LIVE === "true" });
  }
  if (name === "mock") {
    if (!mockPaymentsEnabled()) throw new Error("The test gateway is disabled in production");
    return mock;
  }
  throw new Error(`Unknown PAYMENT_PROVIDER: ${name}`);
}
