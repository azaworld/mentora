"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { certificates, experts, ledger, orders, payouts, programRequests, settings, speakerRequests, speakers, sponsorships, workshops } from "@/db/schema";
import { normalizeCertificateCode } from "@/lib/codes";
import { back, firstError, parseForm, zTaka, zText } from "@/lib/forms";
import { postLedger } from "@/lib/ledger";
import { aiPackagePrice, platformRevenue, splitByPayoutShare, splitByPlatformFee } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const DASH = "/dashboard/admin";

function done(message: string): never {
  revalidatePath(DASH);
  back(DASH, "ok", message);
}

const statusForm = z.object({ id: z.string().min(1), status: z.enum(["APPROVED", "REJECTED"]) });

export async function setExpertStatus(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(statusForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  await getDb().update(experts).set({ status: parsed.data.status }).where(eq(experts.id, parsed.data.id));
  done(parsed.data.status === "APPROVED" ? "Expert approved." : "Expert rejected.");
}

const wsStatusForm = z.object({ id: z.string().min(1), status: z.enum(["PUBLISHED", "REJECTED"]) });

export async function setWorkshopStatus(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(wsStatusForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  await getDb().update(workshops).set({ status: parsed.data.status }).where(eq(workshops.id, parsed.data.id));
  done(parsed.data.status === "PUBLISHED" ? "Workshop published." : "Workshop rejected.");
}

const quoteForm = z.object({ id: z.string().min(1), amount: zTaka(1000, 100_000_000) });

export async function quoteSpeakerRequest(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(quoteForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  await getDb()
    .update(speakerRequests)
    .set({ stage: "QUOTED", quoteMinor: parsed.data.amount })
    .where(and(eq(speakerRequests.id, parsed.data.id), eq(speakerRequests.stage, "REQUESTED")));
  done("Quote recorded.");
}

const idForm = z.object({ id: z.string().min(1) });

/** The client paid the speaker invoice offline (bank transfer). Posts the agency fee to the ledger. */
export async function markSpeakerPaid(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(idForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  await db.transaction(async (tx) => {
    const [req] = await tx.select().from(speakerRequests).where(eq(speakerRequests.id, parsed.data.id)).for("update");
    if (!req || req.stage !== "QUOTED" || !req.quoteMinor) back(DASH, "error", "Only quoted requests can be marked paid.");
    const [sp] = await tx.select({ name: speakers.name }).from(speakers).where(eq(speakers.id, req.speakerId));
    const rates = await getSettings(tx);
    await tx.update(speakerRequests).set({ stage: "PAID" }).where(eq(speakerRequests.id, req.id));
    await postLedger(tx, {
      stream: "SPEAKER_FEES",
      description: `${req.eventType} — ${sp?.name ?? "Speaker"} — ${req.orgName}`,
      split: splitByPlatformFee(req.quoteMinor, rates.speakerFeeBps, rates.techPartnerBps),
    });
  });
  done("Payment recorded.");
}

export async function markProgramPaid(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(idForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  const facilitatorSlug = process.env.AI_FACILITATOR_EXPERT_SLUG ?? "arifuzzaman-antor";
  await db.transaction(async (tx) => {
    const [req] = await tx.select().from(programRequests).where(eq(programRequests.id, parsed.data.id)).for("update");
    if (!req || (req.stage !== "REQUESTED" && req.stage !== "CONFIRMED")) back(DASH, "error", "This request is already closed.");
    const [facilitator] = await tx.select({ id: experts.id }).from(experts).where(eq(experts.slug, facilitatorSlug));
    const rates = await getSettings(tx);
    const price = aiPackagePrice(req.package, rates);
    await tx.update(programRequests).set({ stage: "PAID" }).where(eq(programRequests.id, req.id));
    await postLedger(tx, {
      stream: "AI_FOR_LEADERS",
      description: `${req.package === "EXECUTIVE_BRIEFING" ? "Executive briefing" : "One-day intensive"} — ${req.orgName}`,
      split: splitByPayoutShare(price, rates.aiFacilitatorBps, rates.techPartnerBps),
      expertId: facilitator?.id ?? null,
    });
  });
  done("Program payment recorded.");
}

const sponsorForm = z.object({ id: z.string().min(1), soldTo: zText(2, 160) });

export async function sellSponsorship(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(sponsorForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(sponsorships).where(eq(sponsorships.id, parsed.data.id)).for("update");
    if (!s || s.soldAt) back(DASH, "error", "This package is already sold.");
    const rates = await getSettings(tx);
    await tx.update(sponsorships).set({ soldTo: parsed.data.soldTo, soldAt: new Date() }).where(eq(sponsorships.id, s.id));
    await postLedger(tx, { stream: "SPONSORSHIP", description: `${s.name} — ${parsed.data.soldTo}`, split: platformRevenue(s.priceMinor, rates.techPartnerBps) });
  });
  done("Sponsorship recorded.");
}

const payoutForm = z.object({ expertId: z.string().min(1), amount: zTaka(1, 100_000_000), reference: z.string().max(120).optional() });

export async function recordPayout(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(payoutForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  await db.transaction(async (tx) => {
    const [earned] = await tx.select({ v: sql<number>`coalesce(sum(${ledger.payoutMinor}),0)::int` }).from(ledger).where(eq(ledger.expertId, parsed.data.expertId));
    const [paid] = await tx.select({ v: sql<number>`coalesce(sum(${payouts.amountMinor}),0)::int` }).from(payouts).where(eq(payouts.expertId, parsed.data.expertId));
    const balance = (earned?.v ?? 0) - (paid?.v ?? 0);
    if (parsed.data.amount > balance) back(DASH, "error", "Payout is larger than the balance due.");
    await tx.insert(payouts).values({ expertId: parsed.data.expertId, amountMinor: parsed.data.amount, reference: parsed.data.reference || null });
  });
  done("Payout recorded.");
}

const pct = z.coerce.number().min(0, "must be 0–100").max(100, "must be 0–100").transform((p) => Math.round(p * 100));
const taka = z.coerce.number().min(0, "must be 0 or more").max(10_000_000).transform((t) => Math.round(t * 100));

const settingsForm = z.object({
  starterFee: taka, professionalFee: taka, premierFee: taka,
  starterCommission: pct, professionalCommission: pct, premierCommission: pct,
  workshopFee: pct, speakerFee: pct, aiFacilitator: pct, techPartner: pct, partnerDiscount: pct,
  certificateFee: taka, boostFee: taka, partnerPlanFee: taka, enterprisePlanFee: taka, aiBriefingPrice: taka, aiOneDayPrice: taka,
});

export async function saveSettings(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(settingsForm, form);
  if (!parsed.success) back(`${DASH}#settings`, "error", firstError(parsed.error));
  const v = parsed.data;
  const values = {
    starterFeeMinor: v.starterFee, professionalFeeMinor: v.professionalFee, premierFeeMinor: v.premierFee,
    starterCommissionBps: v.starterCommission, professionalCommissionBps: v.professionalCommission, premierCommissionBps: v.premierCommission,
    workshopFeeBps: v.workshopFee, speakerFeeBps: v.speakerFee, aiFacilitatorBps: v.aiFacilitator, techPartnerBps: v.techPartner,
    partnerDiscountBps: v.partnerDiscount, certificateFeeMinor: v.certificateFee, boostFeeMinor: v.boostFee,
    partnerPlanFeeMinor: v.partnerPlanFee, enterprisePlanFeeMinor: v.enterprisePlanFee,
    aiBriefingPriceMinor: v.aiBriefingPrice, aiOneDayPriceMinor: v.aiOneDayPrice, updatedAt: new Date(),
  };
  await getDb().insert(settings).values({ id: 1, ...values }).onConflictDoUpdate({ target: settings.id, set: values });
  done("Settings saved. New rates apply to new transactions.");
}

const refundForm = z.object({ id: z.string().min(1), reference: zText(2, 120) });

/** Record that a NEEDS_REFUND order was refunded at the gateway or by bank transfer. */
export async function markRefunded(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(refundForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const done_ = await getDb()
    .update(orders)
    .set({ status: "REFUNDED", refundedAt: new Date(), refundReference: parsed.data.reference })
    .where(and(eq(orders.id, parsed.data.id), eq(orders.status, "NEEDS_REFUND")))
    .returning();
  if (!done_.length) back(DASH, "error", "That order is not waiting for a refund.");
  done("Refund recorded.");
}

export async function revokeCertificate(form: FormData) {
  await requireRole("ADMIN");
  const parsed = parseForm(z.object({ code: z.string().min(1) }), form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const code = normalizeCertificateCode(parsed.data.code);
  if (!code) back(DASH, "error", "Enter a valid certificate code.");
  const rows = await getDb().update(certificates).set({ revokedAt: new Date() }).where(and(eq(certificates.code, code), isNull(certificates.revokedAt))).returning();
  if (!rows.length) back(DASH, "error", "No active certificate with that code.");
  done(`Certificate ${code} revoked.`);
}
