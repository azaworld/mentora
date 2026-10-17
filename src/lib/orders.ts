/**
 * Orders: create → pay at the gateway → fulfil exactly once → post to the ledger.
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB, Tx } from "@/db";
import {
  bookings,
  certificates,
  experts,
  needs,
  orders,
  organizations,
  quotes,
  tickets,
  workshops,
  type Order,
} from "@/db/schema";
import { certificateCode, ticketCode, tranId as newTranId } from "./codes";
import { postLedger } from "./ledger";
import { appUrl, getPaymentProvider } from "./payments";
import {
  commissionBps,
  platformRevenue,
  splitByPlatformFee,
} from "./revenue";
import { getSettings } from "./settings";

const DAY = 24 * 60 * 60 * 1000;

export const orderMeta = {
  TICKET: z.object({
    workshopId: z.string(),
    seats: z.number().int().min(1).max(50),
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    orgId: z.string().nullable().optional(),
  }),
  BOOKING: z.object({ quoteId: z.string(), orgId: z.string() }),
  EXPERT_PLAN: z.object({ expertId: z.string(), plan: z.enum(["PROFESSIONAL", "PREMIER"]) }),
  BOOST: z.object({ expertId: z.string() }),
  ORG_PLAN: z.object({ orgId: z.string(), plan: z.enum(["PARTNER", "ENTERPRISE"]) }),
  CERTIFICATE: z.object({
    expertId: z.string(),
    holderName: z.string().min(2),
    program: z.string().min(2),
    orgName: z.string().nullable().optional(),
  }),
} as const;

export type OrderKind = keyof typeof orderMeta;
export type OrderMeta<K extends OrderKind> = z.infer<(typeof orderMeta)[K]>;

export async function createOrder<K extends OrderKind>(
  db: DB | Tx,
  input: { kind: K; amountMinor: number; email: string; userId?: string | null; meta: OrderMeta<K> },
): Promise<Order> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Order amount must be positive");
  const meta = orderMeta[input.kind].parse(input.meta);
  const [order] = await db
    .insert(orders)
    .values({
      tranId: newTranId(),
      kind: input.kind,
      amountMinor: input.amountMinor,
      email: input.email,
      userId: input.userId ?? null,
      meta,
      provider: process.env.PAYMENT_PROVIDER ?? "mock",
    })
    .returning();
  return order!;
}

/** Starts a gateway checkout and returns the URL to send the buyer to. */
export async function checkoutUrl(
  order: Order,
  customer: { name: string; email: string; phone?: string },
  productName: string,
): Promise<string> {
  const provider = getPaymentProvider();
  const base = appUrl();
  const { redirectUrl } = await provider.createCheckout({
    tranId: order.tranId,
    amountMinor: order.amountMinor,
    currency: order.currency,
    customer: { name: customer.name, email: customer.email, phone: customer.phone ?? "" },
    productName,
    productCategory: order.kind.toLowerCase(),
    urls: {
      success: `${base}/api/payments/sslcommerz/success`,
      fail: `${base}/api/payments/sslcommerz/fail`,
      cancel: `${base}/api/payments/sslcommerz/cancel`,
      ipn: `${base}/api/payments/sslcommerz/ipn`,
    },
  });
  return redirectUrl;
}

export class FulfilmentError extends Error {}

/**
 * Marks an order paid and fulfils it. Safe to call more than once (callback + IPN):
 * the order row is locked and only a PENDING order is processed.
 */
export async function completePayment(
  db: DB,
  tranId: string,
  payment: { amountMinor: number; providerRef: string },
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.tranId, tranId)).for("update");
    if (!order) throw new FulfilmentError(`Unknown order ${tranId}`);
    if (order.status !== "PENDING") return order;

    if (payment.amountMinor !== order.amountMinor) {
      const [failed] = await tx
        .update(orders)
        .set({ status: "NEEDS_REFUND", failReason: "Paid amount does not match the order", providerRef: payment.providerRef })
        .where(eq(orders.id, order.id))
        .returning();
      return failed!;
    }

    let result: Record<string, unknown>;
    try {
      result = await fulfil(tx, order);
    } catch (err) {
      if (!(err instanceof FulfilmentError)) throw err;
      const [needsRefund] = await tx
        .update(orders)
        .set({ status: "NEEDS_REFUND", failReason: err.message, providerRef: payment.providerRef, paidAt: new Date() })
        .where(eq(orders.id, order.id))
        .returning();
      return needsRefund!;
    }

    const [paid] = await tx
      .update(orders)
      .set({ status: "PAID", paidAt: new Date(), providerRef: payment.providerRef, result })
      .where(eq(orders.id, order.id))
      .returning();
    return paid!;
  });
}

export async function failPayment(db: DB, tranId: string, reason: string): Promise<void> {
  await db
    .update(orders)
    .set({ status: "FAILED", failReason: reason.slice(0, 500) })
    .where(and(eq(orders.tranId, tranId), eq(orders.status, "PENDING")));
}

async function fulfil(tx: Tx, order: Order): Promise<Record<string, unknown>> {
  const rates = await getSettings(tx);
  const tech = rates.techPartnerBps;

  switch (order.kind) {
    case "TICKET": {
      const m = orderMeta.TICKET.parse(order.meta);
      const [ws] = await tx.select().from(workshops).where(eq(workshops.id, m.workshopId)).for("update");
      if (!ws || ws.status !== "PUBLISHED") throw new FulfilmentError("Workshop is no longer available");
      if (ws.seatsSold + m.seats > ws.seats) throw new FulfilmentError("Not enough seats left");
      await tx
        .update(workshops)
        .set({ seatsSold: sql`${workshops.seatsSold} + ${m.seats}` })
        .where(eq(workshops.id, ws.id));
      const code = ticketCode();
      await tx.insert(tickets).values({
        code,
        workshopId: ws.id,
        orderId: order.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        seats: m.seats,
      });
      await postLedger(tx, {
        stream: "WORKSHOP_TICKETS",
        description: `${ws.title} — ${m.seats} seat${m.seats > 1 ? "s" : ""}`,
        split: splitByPlatformFee(order.amountMinor, rates.workshopFeeBps, tech),
        expertId: ws.expertId,
        orgId: m.orgId ?? null,
        orderId: order.id,
      });
      return { ticketCode: code, workshopId: ws.id, seats: m.seats };
    }

    case "BOOKING": {
      const m = orderMeta.BOOKING.parse(order.meta);
      const [quote] = await tx.select().from(quotes).where(eq(quotes.id, m.quoteId)).for("update");
      if (!quote || quote.status !== "SENT") throw new FulfilmentError("This proposal is no longer open");
      const [need] = await tx.select().from(needs).where(eq(needs.id, quote.needId)).for("update");
      if (!need || need.status !== "OPEN" || need.orgId !== m.orgId) throw new FulfilmentError("This need is no longer open");
      const [expert] = await tx.select().from(experts).where(eq(experts.id, quote.expertId));
      if (!expert) throw new FulfilmentError("Expert not found");

      await tx.update(quotes).set({ status: "ACCEPTED" }).where(eq(quotes.id, quote.id));
      await tx
        .update(quotes)
        .set({ status: "DECLINED" })
        .where(and(eq(quotes.needId, need.id), ne(quotes.id, quote.id)));
      await tx.update(needs).set({ status: "BOOKED" }).where(eq(needs.id, need.id));
      const [booking] = await tx
        .insert(bookings)
        .values({
          needId: need.id,
          quoteId: quote.id,
          orgId: need.orgId,
          expertId: expert.id,
          amountMinor: order.amountMinor,
          orderId: order.id,
        })
        .returning();
      await postLedger(tx, {
        stream: "BOOKING_COMMISSION",
        description: need.title,
        split: splitByPlatformFee(order.amountMinor, commissionBps(expert.plan, rates), tech),
        expertId: expert.id,
        orgId: need.orgId,
        orderId: order.id,
      });
      return { bookingId: booking!.id };
    }

    case "EXPERT_PLAN": {
      const m = orderMeta.EXPERT_PLAN.parse(order.meta);
      const [expert] = await tx
        .update(experts)
        .set({ plan: m.plan, planRenewsAt: new Date(Date.now() + 30 * DAY) })
        .where(eq(experts.id, m.expertId))
        .returning();
      if (!expert) throw new FulfilmentError("Expert not found");
      await postLedger(tx, {
        stream: "EXPERT_SUBSCRIPTIONS",
        description: `${m.plan === "PREMIER" ? "Premier" : "Professional"} plan — ${expert.name}`,
        split: platformRevenue(order.amountMinor, tech),
        expertId: expert.id,
        orderId: order.id,
      });
      return { plan: m.plan };
    }

    case "BOOST": {
      const m = orderMeta.BOOST.parse(order.meta);
      const [current] = await tx.select().from(experts).where(eq(experts.id, m.expertId)).for("update");
      if (!current) throw new FulfilmentError("Expert not found");
      const from = Math.max(Date.now(), current.featuredUntil?.getTime() ?? 0);
      const featuredUntil = new Date(from + 30 * DAY);
      await tx.update(experts).set({ featuredUntil }).where(eq(experts.id, current.id));
      await postLedger(tx, {
        stream: "FEATURED_LISTINGS",
        description: `30-day featured listing — ${current.name}`,
        split: platformRevenue(order.amountMinor, tech),
        expertId: current.id,
        orderId: order.id,
      });
      return { featuredUntil: featuredUntil.toISOString() };
    }

    case "ORG_PLAN": {
      const m = orderMeta.ORG_PLAN.parse(order.meta);
      const [org] = await tx
        .update(organizations)
        .set({ plan: m.plan, planRenewsAt: new Date(Date.now() + 365 * DAY) })
        .where(eq(organizations.id, m.orgId))
        .returning();
      if (!org) throw new FulfilmentError("Organization not found");
      await postLedger(tx, {
        stream: "ORGANIZATION_PLANS",
        description: `${m.plan === "PARTNER" ? "L&D Partner" : "Enterprise academy"} annual plan — ${org.name}`,
        split: platformRevenue(order.amountMinor, tech),
        orgId: org.id,
        orderId: order.id,
      });
      return { plan: m.plan };
    }

    case "CERTIFICATE": {
      const m = orderMeta.CERTIFICATE.parse(order.meta);
      const code = certificateCode();
      await tx.insert(certificates).values({
        code,
        holderName: m.holderName,
        program: m.program,
        orgName: m.orgName ?? null,
        issuedById: m.expertId,
        orderId: order.id,
      });
      await postLedger(tx, {
        stream: "CERTIFICATES",
        description: `Certificate ${code} — ${m.holderName}`,
        split: platformRevenue(order.amountMinor, tech),
        expertId: m.expertId,
        orderId: order.id,
      });
      return { certificateCode: code };
    }
  }
}
