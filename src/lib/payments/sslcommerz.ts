/**
 * SSLCommerz gateway (bKash, Nagad, Rocket, cards and net banking in Bangladesh).
 * Docs: https://developer.sslcommerz.com/
 */
import { toMinor } from "../money";
import type { CheckoutInput, PaymentProvider, ValidationResult } from "./types";

export interface SslCommerzConfig {
  storeId: string;
  storePassword: string;
  live: boolean;
}

type Fetch = typeof fetch;

export function sslcommerz(config: SslCommerzConfig, fetchImpl: Fetch = fetch): PaymentProvider {
  const base = config.live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

  return {
    id: "sslcommerz",

    async createCheckout(input: CheckoutInput) {
      const body = new URLSearchParams({
        store_id: config.storeId,
        store_passwd: config.storePassword,
        total_amount: (input.amountMinor / 100).toFixed(2),
        currency: input.currency,
        tran_id: input.tranId,
        success_url: input.urls.success,
        fail_url: input.urls.fail,
        cancel_url: input.urls.cancel,
        ipn_url: input.urls.ipn,
        cus_name: input.customer.name,
        cus_email: input.customer.email,
        cus_phone: input.customer.phone || "N/A",
        cus_add1: "N/A",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: input.productName.slice(0, 250),
        product_category: input.productCategory,
        product_profile: "non-physical-goods",
      });
      const res = await fetchImpl(`${base}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error(`SSLCommerz init failed with HTTP ${res.status}`);
      const data = (await res.json()) as { status?: string; GatewayPageURL?: string; failedreason?: string };
      if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
        throw new Error(`SSLCommerz init failed: ${data.failedreason ?? "unknown reason"}`);
      }
      return { redirectUrl: data.GatewayPageURL };
    },

    async validate(params: Record<string, string>): Promise<ValidationResult> {
      const valId = params.val_id;
      const tranId = params.tran_id;
      if (!valId) return { ok: false, tranId, reason: params.error || params.status || "Payment not completed" };
      const url = new URL(`${base}/validator/api/validationserverAPI.php`);
      url.search = new URLSearchParams({
        val_id: valId,
        store_id: config.storeId,
        store_passwd: config.storePassword,
        v: "1",
        format: "json",
      }).toString();
      const res = await fetchImpl(url, { method: "GET" });
      if (!res.ok) return { ok: false, tranId, reason: `Validation HTTP ${res.status}` };
      const data = (await res.json()) as {
        status?: string;
        tran_id?: string;
        amount?: string;
        currency?: string;
        bank_tran_id?: string;
        val_id?: string;
      };
      if (data.status !== "VALID" && data.status !== "VALIDATED") {
        return { ok: false, tranId: data.tran_id ?? tranId, reason: `Gateway status ${data.status ?? "unknown"}` };
      }
      if (!data.tran_id || (tranId && data.tran_id !== tranId)) {
        return { ok: false, tranId, reason: "Transaction reference mismatch" };
      }
      const amount = Number(data.amount);
      if (!Number.isFinite(amount)) return { ok: false, tranId: data.tran_id, reason: "Missing amount" };
      return {
        ok: true,
        tranId: data.tran_id,
        amountMinor: toMinor(amount),
        currency: data.currency ?? "BDT",
        providerRef: data.bank_tran_id || data.val_id || valId,
      };
    },
  };
}
