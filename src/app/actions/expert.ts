"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { experts, needs, packages, quotes, workshops } from "@/db/schema";
import { back, firstError, parseForm, zFormat, zInt, zTaka, zText } from "@/lib/forms";
import { checkoutUrl, createOrder } from "@/lib/orders";
import { canSellAndCertify, expertPlanFee } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const DASH = "/dashboard/expert";

async function myProfile() {
  const user = await requireRole("EXPERT");
  if (!user.expertId) back("/dashboard", "error", "No expert profile is linked to this account.");
  const [me] = await getDb().select().from(experts).where(eq(experts.id, user.expertId));
  if (!me) back("/dashboard", "error", "Expert profile not found.");
  return { user, me };
}

const quoteForm = z.object({ needId: z.string().min(1), amount: zTaka(1000, 100_000_000), message: zText(10, 1500) });

export async function sendQuote(form: FormData) {
  const { me } = await myProfile();
  if (me.status !== "APPROVED") back(DASH, "error", "Your profile must be approved before you can send proposals.");
  const parsed = parseForm(quoteForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  const [need] = await db.select().from(needs).where(eq(needs.id, parsed.data.needId));
  if (!need || need.status !== "OPEN" || (need.targetExpertId && need.targetExpertId !== me.id)) {
    back(DASH, "error", "This training need is no longer open.");
  }
  const inserted = await db
    .insert(quotes)
    .values({ needId: need.id, expertId: me.id, amountMinor: parsed.data.amount, message: parsed.data.message })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) back(DASH, "error", "You've already sent a proposal for this need.");
  revalidatePath(DASH);
  back(DASH, "ok", "Proposal sent.");
}

const workshopForm = z.object({
  title: zText(5, 160),
  summary: zText(10, 1000),
  format: zFormat.refine((f) => f !== "EITHER", "choose online or onsite"),
  startsAt: z.coerce.date({ errorMap: () => ({ message: "must be a valid date" }) }).refine((d) => d.getTime() > Date.now(), "must be in the future"),
  duration: zText(2, 80),
  venue: zText(2, 160),
  price: zTaka(100, 1_000_000),
  seats: zInt(1, 1000),
});

export async function createWorkshop(form: FormData) {
  const { me } = await myProfile();
  if (me.status !== "APPROVED") back(DASH, "error", "Your profile must be approved first.");
  if (!canSellAndCertify(me.plan)) back(DASH, "error", "Selling workshops needs the Professional or Premier plan.");
  const parsed = parseForm(workshopForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const v = parsed.data;
  await getDb().insert(workshops).values({
    title: v.title,
    summary: v.summary,
    expertId: me.id,
    format: v.format as "ONLINE" | "ONSITE",
    startsAt: v.startsAt,
    duration: v.duration,
    venue: v.venue,
    priceMinor: v.price,
    seats: v.seats,
    status: "PENDING_REVIEW",
  });
  revalidatePath(DASH);
  back(DASH, "ok", "Workshop submitted. It goes live after review.");
}

const certForm = z.object({ holderName: zText(2, 120), program: zText(2, 160), orgName: z.string().max(160).optional() });

export async function issueCertificate(form: FormData) {
  const { user, me } = await myProfile();
  if (!canSellAndCertify(me.plan)) back(DASH, "error", "Issuing certificates needs the Professional or Premier plan.");
  const parsed = parseForm(certForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  const db = getDb();
  const rates = await getSettings(db);
  const order = await createOrder(db, {
    kind: "CERTIFICATE",
    amountMinor: rates.certificateFeeMinor,
    email: user.email,
    userId: user.id,
    meta: { expertId: me.id, holderName: parsed.data.holderName, program: parsed.data.program, orgName: parsed.data.orgName || null },
  });
  redirect(await checkoutUrl(order, { name: user.name, email: user.email }, `Certificate — ${parsed.data.holderName}`));
}

const planForm = z.object({ plan: z.enum(["PROFESSIONAL", "PREMIER"]) });

export async function buyExpertPlan(form: FormData) {
  const { user, me } = await myProfile();
  const parsed = parseForm(planForm, form);
  if (!parsed.success) back(DASH, "error", firstError(parsed.error));
  if (parsed.data.plan === me.plan) back(DASH, "error", "You're already on this plan.");
  const db = getDb();
  const rates = await getSettings(db);
  const order = await createOrder(db, {
    kind: "EXPERT_PLAN",
    amountMinor: expertPlanFee(parsed.data.plan, rates),
    email: user.email,
    userId: user.id,
    meta: { expertId: me.id, plan: parsed.data.plan },
  });
  redirect(await checkoutUrl(order, { name: user.name, email: user.email }, `${parsed.data.plan === "PREMIER" ? "Premier" : "Professional"} plan — 30 days`));
}

export async function downgradeToStarter() {
  const { me } = await myProfile();
  await getDb().update(experts).set({ plan: "STARTER", planRenewsAt: null }).where(and(eq(experts.id, me.id)));
  revalidatePath(DASH);
  back(DASH, "ok", "Switched to the Starter plan.");
}

export async function buyBoost() {
  const { user, me } = await myProfile();
  if (me.status !== "APPROVED") back(DASH, "error", "Your profile must be approved first.");
  const db = getDb();
  const rates = await getSettings(db);
  const order = await createOrder(db, { kind: "BOOST", amountMinor: rates.boostFeeMinor, email: user.email, userId: user.id, meta: { expertId: me.id } });
  redirect(await checkoutUrl(order, { name: user.name, email: user.email }, "Featured listing — 30 days"));
}

const LANGS = ["Bangla", "English", "Hindi", "Arabic"] as const;

const profileForm = z.object({
  headline: zText(5, 160),
  bio: zText(20, 3000),
  city: zText(2, 80),
  topics: zText(2, 300),
  yearsExperience: zInt(0, 60),
  online: z.string().optional(),
  onsite: z.string().optional(),
  consentToList: z.string().optional(),
});

export async function updateProfile(form: FormData) {
  const { me } = await myProfile();
  const parsed = parseForm(profileForm, form);
  if (!parsed.success) back(`${DASH}#profile`, "error", firstError(parsed.error));
  const v = parsed.data;
  const languages = LANGS.filter((l) => form.get(`lang_${l}`) === "on");
  const formats = [v.online === "on" ? "ONLINE" : null, v.onsite === "on" ? "ONSITE" : null].filter(Boolean) as ("ONLINE" | "ONSITE")[];
  if (!languages.length) back(`${DASH}#profile`, "error", "Choose at least one language.");
  if (!formats.length) back(`${DASH}#profile`, "error", "Choose online, onsite or both.");
  const consent = v.consentToList === "on";
  await getDb()
    .update(experts)
    .set({
      headline: v.headline,
      bio: v.bio,
      city: v.city,
      topics: v.topics.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      yearsExperience: v.yearsExperience,
      languages,
      formats,
      consentToList: consent,
      consentAt: consent ? (me.consentAt ?? new Date()) : null,
    })
    .where(eq(experts.id, me.id));
  revalidatePath(DASH);
  revalidatePath(`/experts/${me.slug}`);
  back(`${DASH}#profile`, "ok", consent ? "Profile saved." : "Profile saved. It is now hidden from the public.");
}

const packageForm = z.object({ title: zText(3, 120), price: zTaka(100, 100_000_000), unit: zText(2, 60) });

export async function addPackage(form: FormData) {
  const { me } = await myProfile();
  const parsed = parseForm(packageForm, form);
  if (!parsed.success) back(`${DASH}#profile`, "error", firstError(parsed.error));
  const db = getDb();
  const existing = await db.select({ id: packages.id }).from(packages).where(eq(packages.expertId, me.id));
  if (existing.length >= 6) back(`${DASH}#profile`, "error", "You can list up to 6 packages.");
  await db.insert(packages).values({ expertId: me.id, title: parsed.data.title, priceMinor: parsed.data.price, unit: parsed.data.unit, sortOrder: existing.length });
  revalidatePath(DASH);
  back(`${DASH}#profile`, "ok", "Package added.");
}

export async function removePackage(form: FormData) {
  const { me } = await myProfile();
  const id = String(form.get("id") ?? "");
  await getDb().delete(packages).where(and(eq(packages.id, id), eq(packages.expertId, me.id)));
  revalidatePath(DASH);
  back(`${DASH}#profile`, "ok", "Package removed.");
}
