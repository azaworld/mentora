import Link from "next/link";
import type { ReactNode } from "react";
import { formatTaka } from "@/lib/money";

const STATUS_TONE: Record<string, string> = {
  OPEN: "info", SENT: "info", QUOTED: "info", REQUESTED: "warn", PENDING: "warn", PENDING_REVIEW: "warn",
  APPROVED: "ok", PUBLISHED: "ok", BOOKED: "ok", ACCEPTED: "ok", CONFIRMED: "ok", COMPLETED: "ok", PAID: "ok",
  DECLINED: "mute", CLOSED: "mute", CANCELLED: "mute", REJECTED: "bad", FAILED: "bad", NEEDS_REFUND: "bad",
};

export function Status({ value }: { value: string }) {
  const label = value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return <span className={`st ${STATUS_TONE[value] ?? "mute"}`}>{label}</span>;
}

export function Taka({ minor }: { minor: number | null | undefined }) {
  return <span className="num">{formatTaka(minor ?? 0)}</span>;
}

export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  if (!o && !e) return null;
  return (
    <div className={`flash ${e ? "error" : "ok"}`} role={e ? "alert" : "status"}>
      {e ?? o}
    </div>
  );
}

const COLORS = ["#14213D", "#0F7C7E", "#B57A12", "#6B4C9A", "#A3361F", "#2E6B3E", "#2B5D8A"];

export function Avatar({ name, seed, large }: { name: string; seed: string; large?: boolean }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  const initials = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`avatar${large ? " lg" : ""}`} style={{ background: COLORS[h % COLORS.length] }} aria-hidden="true">
      {initials}
    </div>
  );
}

export function Stat({ value, label, highlight }: { value: ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={`stat${highlight ? " hl" : ""}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function Field({ label, name, hint, children }: { label: string; name: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const ROLE_LABEL: Record<string, string> = { TRAINER: "Trainer", FACILITATOR: "Facilitator", COACH: "Coach", CONSULTANT: "Consultant" };
export const FORMAT_LABEL: Record<string, string> = { ONLINE: "Online", ONSITE: "Onsite", EITHER: "Online or onsite" };
export const TIER_LABEL: Record<string, string> = { ICON: "Icon", EXECUTIVE: "Executive", EXPERT: "Expert" };

export function DateBlock({ date }: { date: Date }) {
  return (
    <div className="date">
      <b>{String(date.getDate()).padStart(2, "0")}</b>
      <span>{date.toLocaleString("en-GB", { month: "short", timeZone: "Asia/Dhaka" })}</span>
    </div>
  );
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="small">
      <Link className="lnk" href={href}>
        ← {children}
      </Link>
    </p>
  );
}
