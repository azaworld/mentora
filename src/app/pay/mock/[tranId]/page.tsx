import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { payWithTestGateway } from "@/app/actions/payments";
import { Taka } from "@/components/ui";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { mockPaymentsEnabled } from "@/lib/payments";

export const metadata = { title: "Test payment", robots: { index: false } };

/** Stand-in for the payment gateway in development and demos. Disabled in production. */
export default async function MockGateway({ params }: { params: { tranId: string } }) {
  if (!mockPaymentsEnabled()) notFound();
  const [order] = await getDb().select().from(orders).where(eq(orders.tranId, params.tranId));
  if (!order) notFound();
  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <div className="flash ok" style={{ background: "var(--gold-soft)", color: "var(--warn)", borderColor: "var(--gold)" }}>
        Test gateway — no real money moves. Production uses SSLCommerz (bKash, Nagad, Rocket, cards).
      </div>
      <div className="panel">
        <div className="eyebrow">Pay Mentora</div>
        <div className="price" style={{ textAlign: "left", fontSize: 34 }}><Taka minor={order.amountMinor} /></div>
        <p className="small muted">Reference <span className="code">{order.tranId}</span></p>
        {order.status !== "PENDING" ? (
          <p>This order is already {order.status.toLowerCase()}.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <form action={payWithTestGateway}>
              <input type="hidden" name="tranId" value={order.tranId} />
              <input type="hidden" name="outcome" value="pay" />
              <button className="btn btn-primary btn-block" type="submit">Pay (test)</button>
            </form>
            <form action={payWithTestGateway}>
              <input type="hidden" name="tranId" value={order.tranId} />
              <input type="hidden" name="outcome" value="fail" />
              <button className="btn btn-ghost btn-block" type="submit">Cancel payment</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
