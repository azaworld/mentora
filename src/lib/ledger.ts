import type { DB, Tx } from "@/db";
import { ledger, type StreamName } from "@/db/schema";
import type { Split } from "./revenue";

export interface LedgerInput {
  stream: StreamName;
  description: string;
  split: Split;
  expertId?: string | null;
  orgId?: string | null;
  orderId?: string | null;
}

/** Post one entry. An order can post at most once (unique order id), so retries are safe. */
export async function postLedger(db: DB | Tx, input: LedgerInput) {
  const [row] = await db
    .insert(ledger)
    .values({
      stream: input.stream,
      description: input.description,
      grossMinor: input.split.grossMinor,
      payoutMinor: input.split.payoutMinor,
      platformMinor: input.split.platformMinor,
      operatorMinor: input.split.operatorMinor,
      techPartnerMinor: input.split.techPartnerMinor,
      expertId: input.expertId ?? null,
      orgId: input.orgId ?? null,
      orderId: input.orderId ?? null,
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}
