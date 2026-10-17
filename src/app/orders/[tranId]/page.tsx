import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Status, Taka } from "@/components/ui";
import { getDb } from "@/db";
import { orders } from "@/db/schema";

export const metadata = { title: "Payment status", robots: { index: false } };

const KIND_LABEL: Record<string, string> = {
  TICKET: "Workshop registration",
  BOOKING: "Program booking",
  EXPERT_PLAN: "Expert plan",
  BOOST: "Featured listing",
  ORG_PLAN: "Organization plan",
  CERTIFICATE: "Verified certificate",
};

export default async function OrderPage({ params }: { params: { tranId: string } }) {
  const [order] = await getDb().select().from(orders).where(eq(orders.tranId, params.tranId));
  if (!order) notFound();
  const r = (order.result ?? {}) as Record<string, string | number | undefined>;
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="eyebrow">{KIND_LABEL[order.kind]}</div>
      <h2>
        {order.status === "PAID" ? "Payment confirmed" : order.status === "PENDING" ? "Waiting for payment" : order.status === "NEEDS_REFUND" ? "Payment received — we’ll refund you" : order.status === "REFUNDED" ? "Payment refunded" : "Payment not completed"}
      </h2>
      <div className="panel">
        <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "6px 12px", margin: 0, fontSize: 14 }}>
          <dt className="muted">Status</dt><dd style={{ margin: 0 }}><Status value={order.status} /></dd>
          <dt className="muted">Amount</dt><dd style={{ margin: 0 }}><Taka minor={order.amountMinor} /></dd>
          <dt className="muted">Reference</dt><dd style={{ margin: 0 }} className="code">{order.tranId}</dd>
          {r.ticketCode ? <><dt className="muted">E-ticket</dt><dd style={{ margin: 0 }} className="code">{r.ticketCode}</dd></> : null}
          {r.certificateCode ? <><dt className="muted">Certificate</dt><dd style={{ margin: 0 }}><Link className="lnk code" href={`/verify?code=${r.certificateCode}`}>{r.certificateCode}</Link></dd></> : null}
          {order.failReason ? <><dt className="muted">Note</dt><dd style={{ margin: 0 }}>{order.failReason}</dd></> : null}
        </dl>
      </div>
      {order.status === "NEEDS_REFUND" ? <div className="note gold">Your payment arrived but we couldn’t complete the order. Our team will refund you within 7 working days.</div> : null}
      <div className="btns">
        {order.userId ? <Link className="btn btn-primary" href="/dashboard">Go to dashboard</Link> : <Link className="btn btn-primary" href="/workshops">Browse workshops</Link>}
      </div>
    </div>
  );
}
