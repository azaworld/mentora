import { eq } from "drizzle-orm";
import type { DB, Tx } from "@/db";
import { settings } from "@/db/schema";
import type { Rates } from "./revenue";

export async function getSettings(db: DB | Tx): Promise<Rates> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return stripMeta(row);
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  if (created) return stripMeta(created);
  const [again] = await db.select().from(settings).where(eq(settings.id, 1));
  return stripMeta(again!);
}

function stripMeta(row: typeof settings.$inferSelect): Rates {
  const { id: _id, updatedAt: _u, ...rates } = row;
  return rates;
}
