import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window limiter stored in Postgres, so it holds across server instances.
 * Returns true when the action is allowed.
 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const [row] = await getDb()
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} = ${windowStart.toISOString()}::timestamptz then ${rateLimits.count} + 1 else 1 end`,
        windowStart,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 1) <= limit;
}

/** Best-effort client address from the proxy headers. */
export function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
