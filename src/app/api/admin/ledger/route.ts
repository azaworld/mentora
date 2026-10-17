import { desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ledger } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { STREAM_LABELS } from "@/lib/revenue";

export const dynamic = "force-dynamic";

/** Full ledger as CSV (admins only). Amounts in taka. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await getDb().select().from(ledger).orderBy(desc(ledger.createdAt));
  const t = (m: number) => (m / 100).toFixed(2);
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ["Date", "Stream", "Description", "Gross", "Payout", "Platform", "Operator share", "Tech partner share"].map(cell).join(","),
    ...rows.map((r) =>
      [r.createdAt.toISOString().slice(0, 10), STREAM_LABELS[r.stream], r.description, t(r.grossMinor), t(r.payoutMinor), t(r.platformMinor), t(r.operatorMinor), t(r.techPartnerMinor)]
        .map(cell)
        .join(","),
    ),
  ];
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mentora-ledger.csv"` },
  });
}
