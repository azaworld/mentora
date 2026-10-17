"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { hashPassword, PASSWORD_MIN } from "@/lib/auth";
import { emailText, sendEmail } from "@/lib/email";
import { back, firstError, parseForm, zEmail } from "@/lib/forms";
import { appUrl } from "@/lib/payments";
import { allow, clientIp } from "@/lib/rate-limit";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const RESET_MINUTES = 60;

export async function requestPasswordReset(form: FormData) {
  const parsed = parseForm(z.object({ email: zEmail }), form);
  if (!parsed.success) back("/forgot-password", "error", firstError(parsed.error));
  const email = parsed.data.email;
  if (!(await allow(`reset:ip:${clientIp()}`, 10, 3600)) || !(await allow(`reset:email:${email}`, 3, 3600))) {
    back("/forgot-password", "error", "Too many requests. Please try again in an hour.");
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResets).values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) });
    await sendEmail({
      to: user.email,
      subject: "Reset your Mentora password",
      text: emailText([
        `Hi ${user.name},`,
        `Use this link to choose a new password. It works once and expires in ${RESET_MINUTES} minutes:`,
        `${appUrl()}/reset-password?token=${token}`,
        "If you didn't ask for this, you can ignore this email.",
      ]),
    });
  }
  // Same answer whether or not the account exists.
  back("/forgot-password", "ok", "If an account exists for that email, we've sent a reset link.");
}

const resetForm = z
  .object({
    token: z.string().min(20),
    password: z.string().min(PASSWORD_MIN, `must be at least ${PASSWORD_MIN} characters`).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const page = `/reset-password?token=${encodeURIComponent(token)}`;
  const parsed = parseForm(resetForm, form);
  if (!parsed.success) back(page, "error", firstError(parsed.error));
  const db = getDb();
  const passwordHash = await hashPassword(parsed.data.password);
  const ok = await db.transaction(async (tx) => {
    const [reset] = await tx
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, sha256(parsed.data.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
      .for("update");
    if (!reset) return false;
    await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
    await tx.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));
    return true;
  });
  if (!ok) back("/forgot-password", "error", "That reset link is invalid or has expired. Request a new one.");
  redirect(`/login?ok=${encodeURIComponent("Password updated. Please sign in.")}`);
}
