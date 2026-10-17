"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { experts, organizations, users } from "@/db/schema";
import { hashPassword, PASSWORD_MIN } from "@/lib/auth";
import { slugify, randomCode } from "@/lib/codes";
import { back, firstError, parseForm, zEmail, zInt, zText } from "@/lib/forms";

const base = z.object({
  name: zText(2, 120),
  email: zEmail,
  password: z.string().min(PASSWORD_MIN, `must be at least ${PASSWORD_MIN} characters`).max(200),
});

const orgSignup = base.extend({ accountType: z.literal("ORG"), orgName: zText(2, 160) });

const expertSignup = base.extend({
  accountType: z.literal("EXPERT"),
  role: z.enum(["TRAINER", "FACILITATOR", "COACH", "CONSULTANT"]),
  headline: zText(5, 160),
  city: zText(2, 80),
  topics: zText(2, 300),
  yearsExperience: zInt(0, 60),
  consent: z.literal("on", { errorMap: () => ({ message: "Please agree to be listed publicly once approved" }) }),
});

const signup = z.discriminatedUnion("accountType", [orgSignup, expertSignup]);

export async function signupAction(form: FormData) {
  const type = form.get("accountType") === "EXPERT" ? "EXPERT" : "ORG";
  const page = `/signup?type=${type.toLowerCase()}`;
  const parsed = parseForm(signup, form);
  if (!parsed.success) back(page, "error", firstError(parsed.error));
  const v = parsed.data;
  const db = getDb();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, v.email));
  if (existing) back(page, "error", "An account with this email already exists. Sign in instead.");
  const passwordHash = await hashPassword(v.password);

  await db.transaction(async (tx) => {
    if (v.accountType === "ORG") {
      const [org] = await tx.insert(organizations).values({ name: v.orgName }).returning();
      await tx.insert(users).values({ email: v.email, name: v.name, passwordHash, role: "ORG", orgId: org!.id });
      return;
    }
    const [user] = await tx.insert(users).values({ email: v.email, name: v.name, passwordHash, role: "EXPERT" }).returning();
    const topics = v.topics.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
    await tx.insert(experts).values({
      userId: user!.id,
      slug: `${slugify(v.name)}-${randomCode(4).toLowerCase()}`,
      name: v.name,
      role: v.role,
      headline: v.headline,
      bio: v.headline,
      city: v.city,
      languages: ["English"],
      formats: ["ONLINE", "ONSITE"],
      topics,
      yearsExperience: v.yearsExperience,
      status: "PENDING",
      consentToList: true,
      consentAt: new Date(),
    });
  });

  redirect(`/login?ok=${encodeURIComponent(v.accountType === "EXPERT" ? "Account created. Your profile goes live after review." : "Account created. Please sign in.")}`);
}
