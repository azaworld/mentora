import { randomBytes } from "node:crypto";

/** Crockford base32 without I, L, O, U — easy to read aloud and type. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % 32];
  return out;
}

/** Certificate code, e.g. MN-2026-7K3QX9PD. */
export function certificateCode(year = new Date().getFullYear()): string {
  return `MN-${year}-${randomCode(8)}`;
}

export function ticketCode(): string {
  return `TK-${randomCode(8)}`;
}

/** Payment transaction reference sent to the gateway (unguessable). */
export function tranId(): string {
  return `MNT${randomCode(20)}`;
}

const CERT_RE = /^MN-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$/;

export function normalizeCertificateCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  return CERT_RE.test(code) ? code : null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
