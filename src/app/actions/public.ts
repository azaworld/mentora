"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { experts, programRequests, speakerRequests, speakers, workshops } from "@/db/schema";
import { back, firstError, parseForm, zEmail, zInt, zText } from "@/lib/forms";
import { checkoutUrl, createOrder } from "@/lib/orders";
import { currentUser } from "@/lib/session";

const ticketForm = z.object({
  workshopId: z.string().min(1),
  name: zText(2, 120),
  email: zEmail,
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/, "must be a valid phone number"),
  seats: zInt(1, 50),
});

export async function startTicketCheckout(form: FormData) {
  const workshopId = String(form.get("workshopId") ?? "");
  const page = `/workshops/${encodeURIComponent(workshopId)}`;
  const parsed = parseForm(ticketForm, form);
  if (!parsed.success) back(page, "error", firstError(parsed.error));
  const v = parsed.data;

  const db = getDb();
  const [row] = await db
    .select({ ws: workshops, expertStatus: experts.status })
    .from(workshops)
    .innerJoin(experts, eq(workshops.expertId, experts.id))
    .where(and(eq(workshops.id, v.workshopId), eq(workshops.status, "PUBLISHED")));
  if (!row || row.expertStatus !== "APPROVED") back("/workshops", "error", "That workshop is no longer available.");
  const left = row.ws.seats - row.ws.seatsSold;
  if (v.seats > left) back(page, "error", left > 0 ? `Only ${left} seat${left > 1 ? "s" : ""} left.` : "This workshop is sold out.");

  const user = await currentUser();
  const order = await createOrder(db, {
    kind: "TICKET",
    amountMinor: row.ws.priceMinor * v.seats,
    email: v.email,
    userId: user?.id,
    meta: { workshopId: row.ws.id, seats: v.seats, name: v.name, email: v.email, phone: v.phone, orgId: user?.orgId ?? null },
  });
  const url = await checkoutUrl(order, { name: v.name, email: v.email, phone: v.phone }, row.ws.title);
  redirect(url);
}

const speakerForm = z.object({
  speakerId: z.string().min(1),
  orgName: zText(2, 160),
  email: zEmail,
  eventType: z.enum(["Conference keynote", "Leadership retreat", "Town hall", "Panel discussion", "Online session"]),
  audience: zInt(5, 100_000),
  eventDate: z.coerce.date({ errorMap: () => ({ message: "must be a valid date" }) }).refine((d) => d.getTime() > Date.now(), "must be in the future"),
});

export async function requestSpeaker(form: FormData) {
  const speakerId = String(form.get("speakerId") ?? "");
  const slug = String(form.get("slug") ?? "");
  const page = `/speakers/${encodeURIComponent(slug)}`;
  const parsed = parseForm(speakerForm, form);
  if (!parsed.success) back(page, "error", firstError(parsed.error));
  const db = getDb();
  const [sp] = await db.select({ id: speakers.id }).from(speakers).where(and(eq(speakers.id, speakerId), eq(speakers.consentToList, true)));
  if (!sp) back("/speakers", "error", "That speaker is not available.");
  await db.insert(speakerRequests).values({ ...parsed.data, speakerId: sp.id });
  back(page, "ok", "Enquiry received. We'll confirm availability and the fee within two working days.");
}

const programForm = z.object({
  orgName: zText(2, 160),
  email: zEmail,
  package: z.enum(["EXECUTIVE_BRIEFING", "ONE_DAY_INTENSIVE"]),
  leaders: zInt(3, 200),
});

export async function requestProgram(form: FormData) {
  const parsed = parseForm(programForm, form);
  if (!parsed.success) back("/ai-for-leaders", "error", firstError(parsed.error));
  await getDb().insert(programRequests).values(parsed.data);
  back("/ai-for-leaders", "ok", "Request received. We'll confirm dates and send an invoice.");
}
