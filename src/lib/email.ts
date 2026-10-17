/**
 * Transactional email. Uses Resend's HTTP API in production; prints to the log in development.
 * Sending is best-effort: a failed email never fails the payment or action that triggered it.
 */
import { log } from "./log";

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      log("info", "email.sent", { to: email.to, subject: email.subject });
      return;
    }
    log("info", "email.console", { to: email.to, subject: email.subject, text: email.text });
  } catch (err) {
    log("error", "email.failed", { to: email.to, subject: email.subject, error: String(err) });
  }
}

const SIGNATURE = "\n\n— Mentora\nLearning & leadership marketplace";

export function emailText(lines: string[]): string {
  return lines.join("\n") + SIGNATURE;
}
