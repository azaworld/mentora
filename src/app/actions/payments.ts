"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { completePayment, failPayment } from "@/lib/orders";
import { mockPaymentsEnabled } from "@/lib/payments";

/** Test gateway only — refuses to run unless mock payments are enabled. */
export async function payWithTestGateway(form: FormData) {
  if (!mockPaymentsEnabled()) throw new Error("The test gateway is disabled");
  const tranId = String(form.get("tranId") ?? "");
  const outcome = String(form.get("outcome") ?? "");
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.tranId, tranId));
  if (!order) redirect("/");
  if (outcome === "pay") {
    await completePayment(db, tranId, { amountMinor: order.amountMinor, providerRef: `TEST-${Date.now()}` });
  } else {
    await failPayment(db, tranId, "Cancelled at the test gateway");
  }
  redirect(`/orders/${encodeURIComponent(tranId)}`);
}
