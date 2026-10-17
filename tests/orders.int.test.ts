/**
 * Integration tests against a real PostgreSQL database.
 * Run with TEST_DATABASE_URL set to an empty database (migrations are applied here).
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "@/db/schema";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("order fulfilment", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof s>>;
  let lib: typeof import("@/lib/orders");

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.PAYMENT_PROVIDER = "mock";
    pool = new Pool({ connectionString: url });
    db = drizzle(pool, { schema: s });
    await pool.query("drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;");
    await migrate(db, { migrationsFolder: "./drizzle" });
    lib = await import("@/lib/orders");
  });
  afterAll(async () => {
    await pool?.end();
  });

  async function makeExpert(plan: s.ExpertPlan = "PROFESSIONAL") {
    const [e] = await db.insert(s.experts).values({ slug: `e-${Math.random().toString(36).slice(2)}`, name: "Test Expert", role: "TRAINER", headline: "h", bio: "b", city: "Dhaka", plan, status: "APPROVED", consentToList: true }).returning();
    return e!;
  }

  it("sells a ticket once, posts the 15% fee, and ignores a duplicate callback", async () => {
    const e = await makeExpert();
    const [ws] = await db.insert(s.workshops).values({ title: "W", summary: "s", expertId: e.id, format: "ONLINE", startsAt: new Date(Date.now() + 86_400_000), duration: "1d", venue: "x", priceMinor: 500_000, seats: 3, status: "PUBLISHED" }).returning();
    const order = await lib.createOrder(db, { kind: "TICKET", amountMinor: 1_000_000, email: "a@b.co", meta: { workshopId: ws!.id, seats: 2, name: "A", email: "a@b.co", phone: "017" } });

    const paid = await lib.completePayment(db, order.tranId, { amountMinor: 1_000_000, providerRef: "R1" });
    expect(paid.status).toBe("PAID");
    const again = await lib.completePayment(db, order.tranId, { amountMinor: 1_000_000, providerRef: "R1" });
    expect(again.status).toBe("PAID");

    const [w] = await db.select().from(s.workshops).where(eq(s.workshops.id, ws!.id));
    expect(w!.seatsSold).toBe(2);
    const entries = await db.select().from(s.ledger).where(eq(s.ledger.orderId, order.id));
    expect(entries).toHaveLength(1);
    expect(entries[0]!.platformMinor).toBe(150_000);
    expect(entries[0]!.payoutMinor).toBe(850_000);
  });

  it("flags an oversold ticket for refund instead of overbooking", async () => {
    const e = await makeExpert();
    const [ws] = await db.insert(s.workshops).values({ title: "Small", summary: "s", expertId: e.id, format: "ONLINE", startsAt: new Date(Date.now() + 86_400_000), duration: "1d", venue: "x", priceMinor: 100_000, seats: 1, seatsSold: 1, status: "PUBLISHED" }).returning();
    const order = await lib.createOrder(db, { kind: "TICKET", amountMinor: 100_000, email: "a@b.co", meta: { workshopId: ws!.id, seats: 1, name: "A", email: "a@b.co", phone: "017" } });
    const res = await lib.completePayment(db, order.tranId, { amountMinor: 100_000, providerRef: "R2" });
    expect(res.status).toBe("NEEDS_REFUND");
    expect(await db.select().from(s.ledger).where(eq(s.ledger.orderId, order.id))).toHaveLength(0);
  });

  it("rejects a payment whose amount doesn't match", async () => {
    const e = await makeExpert();
    const order = await lib.createOrder(db, { kind: "BOOST", amountMinor: 200_000, email: "a@b.co", meta: { expertId: e.id } });
    const res = await lib.completePayment(db, order.tranId, { amountMinor: 100, providerRef: "R3" });
    expect(res.status).toBe("NEEDS_REFUND");
  });

  it("books a proposal, declines the others, and charges the plan commission", async () => {
    const [org] = await db.insert(s.organizations).values({ name: "Org" }).returning();
    const a = await makeExpert("PREMIER");
    const b = await makeExpert("STARTER");
    const [need] = await db.insert(s.needs).values({ orgId: org!.id, title: "Need", detail: "d", participants: 10, budgetMinor: 10_000_000, format: "ONSITE" }).returning();
    const [qa] = await db.insert(s.quotes).values({ needId: need!.id, expertId: a.id, amountMinor: 10_000_000, message: "m" }).returning();
    await db.insert(s.quotes).values({ needId: need!.id, expertId: b.id, amountMinor: 9_000_000, message: "m" });

    const order = await lib.createOrder(db, { kind: "BOOKING", amountMinor: 10_000_000, email: "o@b.co", meta: { quoteId: qa!.id, orgId: org!.id } });
    const res = await lib.completePayment(db, order.tranId, { amountMinor: 10_000_000, providerRef: "R4" });
    expect(res.status).toBe("PAID");

    const qs = await db.select().from(s.quotes).where(eq(s.quotes.needId, need!.id));
    expect(qs.find((q) => q.expertId === a.id)!.status).toBe("ACCEPTED");
    expect(qs.find((q) => q.expertId === b.id)!.status).toBe("DECLINED");
    const [entry] = await db.select().from(s.ledger).where(eq(s.ledger.orderId, order.id));
    expect(entry!.platformMinor).toBe(1_000_000);
    expect(entry!.techPartnerMinor).toBe(300_000);
  });

  it("issues a verifiable certificate", async () => {
    const e = await makeExpert();
    const order = await lib.createOrder(db, { kind: "CERTIFICATE", amountMinor: 50_000, email: "a@b.co", meta: { expertId: e.id, holderName: "Jane Doe", program: "AI for Leaders" } });
    const res = await lib.completePayment(db, order.tranId, { amountMinor: 50_000, providerRef: "R5" });
    const code = (res.result as { certificateCode: string }).certificateCode;
    const [cert] = await db.select().from(s.certificates).where(eq(s.certificates.code, code));
    expect(cert!.holderName).toBe("Jane Doe");
  });
});

d("rate limits", () => {
  it("allows up to the limit in a window, then blocks", async () => {
    process.env.DATABASE_URL = url;
    const { allow } = await import("@/lib/rate-limit");
    const key = `test:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await allow(key, 3, 60));
    expect(results).toEqual([true, true, true, false]);
  });
});
