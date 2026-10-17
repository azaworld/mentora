import { describe, expect, it, vi } from "vitest";
import { sslcommerz } from "@/lib/payments/sslcommerz";

const cfg = { storeId: "teststore", storePassword: "secret", live: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("SSLCommerz provider", () => {
  it("creates a checkout session with the amount in taka", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay/abc" }));
    const p = sslcommerz(cfg, fetchMock as unknown as typeof fetch);
    const { redirectUrl } = await p.createCheckout({
      tranId: "MNT1", amountMinor: 1_200_050, currency: "BDT",
      customer: { name: "A", email: "a@example.com", phone: "01700000000" },
      productName: "Ticket", productCategory: "ticket",
      urls: { success: "s", fail: "f", cancel: "c", ipn: "i" },
    });
    expect(redirectUrl).toBe("https://sandbox.sslcommerz.com/pay/abc");
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams;
    expect(body.get("total_amount")).toBe("12000.50");
    expect(body.get("tran_id")).toBe("MNT1");
  });

  it("throws when the gateway refuses the session", async () => {
    const p = sslcommerz(cfg, vi.fn().mockResolvedValue(json({ status: "FAILED", failedreason: "Store inactive" })) as unknown as typeof fetch);
    await expect(p.createCheckout({ tranId: "x", amountMinor: 100, currency: "BDT", customer: { name: "a", email: "a@b.co", phone: "" }, productName: "p", productCategory: "c", urls: { success: "", fail: "", cancel: "", ipn: "" } })).rejects.toThrow("Store inactive");
  });

  it("accepts only payments the gateway validates", async () => {
    const ok = sslcommerz(cfg, vi.fn().mockResolvedValue(json({ status: "VALID", tran_id: "MNT1", amount: "12000.50", currency: "BDT", bank_tran_id: "B1" })) as unknown as typeof fetch);
    expect(await ok.validate({ val_id: "v1", tran_id: "MNT1" })).toEqual({ ok: true, tranId: "MNT1", amountMinor: 1_200_050, currency: "BDT", providerRef: "B1" });

    const invalid = sslcommerz(cfg, vi.fn().mockResolvedValue(json({ status: "INVALID_TRANSACTION", tran_id: "MNT1" })) as unknown as typeof fetch);
    expect((await invalid.validate({ val_id: "v1", tran_id: "MNT1" })).ok).toBe(false);

    const mismatch = sslcommerz(cfg, vi.fn().mockResolvedValue(json({ status: "VALID", tran_id: "OTHER", amount: "1" })) as unknown as typeof fetch);
    expect((await mismatch.validate({ val_id: "v1", tran_id: "MNT1" })).ok).toBe(false);

    expect((await ok.validate({ tran_id: "MNT1" })).ok).toBe(false);
  });
});
