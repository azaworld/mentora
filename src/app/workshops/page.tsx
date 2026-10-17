import type { Metadata } from "next";
import Link from "next/link";
import { WorkshopRow } from "@/components/cards";
import { Empty } from "@/components/ui";
import { listWorkshops } from "@/lib/queries";

export const metadata: Metadata = { title: "Workshops" };

export default async function WorkshopsPage({ searchParams }: { searchParams: { format?: string } }) {
  const format = searchParams.format ?? "";
  const rows = await listWorkshops(format);
  return (
    <>
      <div className="eyebrow">Paid workshops</div>
      <h2>Upcoming workshops — online and onsite</h2>
      <p className="lead">Open-enrolment sessions led by vetted experts. Pay by bKash, Nagad or card, get an e-ticket, and receive a verifiable certificate on completion.</p>
      <div className="chips" style={{ margin: "16px 0 20px" }}>
        {[["", "All"], ["ONLINE", "Online"], ["ONSITE", "Onsite"]].map(([v, l]) => (
          <Link key={v} className={`chip${format === v ? " on" : ""}`} href={v ? `/workshops?format=${v}` : "/workshops"}>{l}</Link>
        ))}
      </div>
      {rows.length ? rows.map((r) => <WorkshopRow key={r.workshop.id} workshop={r.workshop} expert={r.expert} />) : <Empty>No upcoming workshops in this format yet.</Empty>}
    </>
  );
}
