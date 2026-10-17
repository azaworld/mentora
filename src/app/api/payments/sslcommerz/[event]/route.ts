import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { completePayment, failPayment } from "@/lib/orders";
import { appUrl, getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * SSLCommerz posts the browser back to success / fail / cancel, and calls ipn server-to-server.
 * Every success is re-validated with the gateway before anything is fulfilled.
 */
export async function POST(req: NextRequest, { params }: { params: { event: string } }) {
  const form = await req.formData();
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
  const tranId = fields.tran_id ?? "";
  const db = getDb();

  if (params.event === "success" || params.event === "ipn") {
    const result = await getPaymentProvider().validate(fields);
    if (result.ok) {
      await completePayment(db, result.tranId, { amountMinor: result.amountMinor, providerRef: result.providerRef });
    } else if (result.tranId) {
      await failPayment(db, result.tranId, result.reason);
    }
  } else if (params.event === "fail" || params.event === "cancel") {
    if (tranId) await failPayment(db, tranId, params.event === "cancel" ? "Cancelled by the buyer" : fields.error || "Payment failed");
  } else {
    return NextResponse.json({ error: "Unknown event" }, { status: 404 });
  }

  if (params.event === "ipn") return NextResponse.json({ received: true });
  return NextResponse.redirect(`${appUrl()}/orders/${encodeURIComponent(tranId)}`, 303);
}
