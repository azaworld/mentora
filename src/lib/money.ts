/** Money helpers. All amounts are integer minor units (poisha). */

export const MINOR_PER_TAKA = 100;

export function toMinor(taka: number): number {
  if (!Number.isFinite(taka)) throw new Error("Amount must be a finite number");
  return Math.round(taka * MINOR_PER_TAKA);
}

export function toTaka(minor: number): number {
  return minor / MINOR_PER_TAKA;
}

/** Format minor units as Bangladeshi taka with lakh grouping, e.g. ৳1,50,000. */
export function formatTaka(minor: number): string {
  const taka = minor / MINOR_PER_TAKA;
  const hasPaisa = minor % MINOR_PER_TAKA !== 0;
  return (
    "৳" +
    taka.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaisa ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Share of an amount in basis points, rounded to the nearest minor unit. */
export function bpsOf(amountMinor: number, bps: number): number {
  assertMinor(amountMinor);
  assertBps(bps);
  return Math.round((amountMinor * bps) / 10_000);
}

export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

export function assertMinor(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`Invalid amount: ${amountMinor}`);
  }
}

export function assertBps(bps: number): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error(`Invalid rate: ${bps} bps`);
  }
}
