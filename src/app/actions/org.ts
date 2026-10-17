"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { experts, needs, organizations, quotes } from "@/db/schema";
import { back, firstError, parseForm, zFormat, zInt, zTaka, zText } from "@/lib/forms";
import { checkoutUrl, createOrder } from "@/lib/orders";
import { orgBookingPrice, orgPlanFee } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const DASH = "/dashboard/org";

const needForm = z.object({
  title: zText(5, 160),
  detail: zText(10, 2000),
  participants: zInt(1, 5000),
  budget: zTaka(1000, 100_000_000),
  format: zFormat,
  targetExpertId: z.string().optional(),
  returnTo: z.string().optional(),
});

export async function postNeed(form: FormData) {
  const user = await requireRole("ORG");
  const parsed = parseForm(needForm, form);
  const returnTo = safePath(String(form.get("returnTo") ?? DASH));
  if (!parsed.success) back(returnTo, "error", firstError(parsed.error));
  const v = parsed.data;
  const db = getDb();

  let targetExpertId: string | null = null;
  if (v.targetExpertId) {
    const [e] = await db
      .select({ id: experts.id })
      .from(experts)
      .where(and(eq(experts.id, v.targetExpertId), eq(experts.status, "APPROVED"), eq(experts.consentToList, true)));
    if (!e) back(returnTo, "error", "That expert is not available.");
    targetExpertId = e.id;
  }

  await db.insert(needs).values({
    orgId: user.orgId!,
    title: v.title,
    detail: v.detail,
    participants: v.participants,
    budgetMinor: v.budget,
    format: v.format,
    targetExpertId,
  });
  revalidatePath(DASH);
  back(DASH, "ok", targetExpertId ? "Request sent to the expert." : "Training need posted. Matched experts can now send proposals.");
}

export async function acceptQuote(form: FormData) {
  const user = await requireRole("ORG");
  const quoteId = String(form.get("quoteId") ?? "");
  const db = getDb();
  const [row] = await db
    .select({ quote: quotes, need: needs, org: organizations, expertName: experts.name })
    .from(quotes)
    .innerJoin(needs, eq(quotes.needId, needs.id))
    .innerJoin(organizations, eq(needs.orgId, organizations.id))
    .innerJoin(experts, eq(quotes.expertId, experts.id))
    .where(eq(quotes.id, quoteId));
  if (!row || row.need.orgId !== user.orgId) back(DASH, "error", "Proposal not found.");
  if (row.need.status !== "OPEN" || row.quote.status !== "SENT") back(DASH, "error", "This proposal is no longer open.");

  const rates = await getSettings(db);
  const order = await createOrder(db, {
    kind: "BOOKING",
    amountMinor: orgBookingPrice(row.quote.amountMinor, row.org.plan, rates),
    email: user.email,
    userId: user.id,
    meta: { quoteId: row.quote.id, orgId: row.org.id },
  });
  redirect(await checkoutUrl(order, { name: user.name, email: user.email }, `${row.need.title} — ${row.expertName}`));
}

const planForm = z.object({ plan: z.enum(["PARTNER", "ENTERPRISE"]) });

export async function buyOrgPlan(form: FormData) {
  const user = await requireRole("ORG");
  const parsed = parseForm(planForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  const rates = await getSettings(db);
  const order = await createOrder(db, {
    kind: "ORG_PLAN",
    amountMinor: orgPlanFee(parsed.data.plan, rates),
    email: user.email,
    userId: user.id,
    meta: { orgId: user.orgId!, plan: parsed.data.plan },
  });
  redirect(await checkoutUrl(order, { name: user.name, email: user.email }, `${parsed.data.plan === "PARTNER" ? "L&D Partner" : "Enterprise academy"} plan`));
}

function safePath(p: string): string {
  return p.startsWith("/") && !p.startsWith("//") ? p : DASH;
}
