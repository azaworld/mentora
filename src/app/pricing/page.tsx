import type { Metadata } from "next";
import Link from "next/link";
import { Taka } from "@/components/ui";
import { getDb } from "@/db";
import { formatBps } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Pricing" };

export default async function Pricing() {
  const r = await getSettings(getDb());
  const expertPlans = [
    { name: "Starter", fee: r.starterFeeMinor, com: r.starterCommissionBps, items: ["Reviewed public profile", "Receive proposal requests", "Listed in search"] },
    { name: "Professional", fee: r.professionalFeeMinor, com: r.professionalCommissionBps, items: ["Verified badge", "Sell your own workshops", "Issue verified certificates"], pop: true },
    { name: "Premier", fee: r.premierFeeMinor, com: r.premierCommissionBps, items: ["Lowest commission", "Speakers bureau listing", "Priority support"] },
  ];
  const orgPlans = [
    { name: "Pay as you go", fee: 0, note: "Standard prices", items: ["Post training needs", "Compare proposals", "Book seats and speakers"] },
    { name: "L&D Partner", fee: r.partnerPlanFeeMinor, note: `${formatBps(r.partnerDiscountBps)} off all bookings`, items: ["Dedicated account manager", "Quarterly training calendar", "Bulk certificates"], pop: true },
    { name: "Enterprise academy", fee: r.enterprisePlanFeeMinor, note: `${formatBps(r.partnerDiscountBps)} off + custom programs`, items: ["Branded learning portal", "Custom certification tracks", "AI training-needs analysis"] },
  ];
  return (
    <>
      <div className="eyebrow">Pricing</div>
      <h2>Simple, transparent pricing</h2>
      <p className="lead">Experts start free and pay a commission only when they earn. Organizations pay as they go or save with an annual plan.</p>
      <h3 style={{ marginTop: 28 }}>For experts</h3>
      <div className="plans">
        {expertPlans.map((p) => (
          <div key={p.name} className={`plan${p.pop ? " pop" : ""}`}>
            <h3>{p.name}</h3>
            <div className="amt"><Taka minor={p.fee} /> <small>/ month</small></div>
            <div className="com">{formatBps(p.com)} commission on bookings</div>
            <ul className="list">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <Link className={`btn ${p.pop ? "btn-primary" : "btn-ghost"}`} href="/signup?type=expert">{p.fee ? `Start on ${p.name}` : "Apply free"}</Link>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 28 }}>For organizations</h3>
      <div className="plans">
        {orgPlans.map((p) => (
          <div key={p.name} className={`plan${p.pop ? " pop" : ""}`}>
            <h3>{p.name}</h3>
            <div className="amt"><Taka minor={p.fee} /> <small>{p.fee ? "/ year" : ""}</small></div>
            <div className="com">{p.note}</div>
            <ul className="list">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <Link className={`btn ${p.pop ? "btn-primary" : "btn-ghost"}`} href="/signup?type=org">{p.fee ? `Choose ${p.name}` : "Start free"}</Link>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 28 }}>Fees &amp; add-ons</h3>
      <div className="tw">
        <table className="t">
          <thead><tr><th>Item</th><th>Who pays</th><th className="r">Price</th></tr></thead>
          <tbody>
            <tr><td><b>Workshop platform fee</b></td><td className="muted">Included in the ticket price</td><td className="r">{formatBps(r.workshopFeeBps)} of ticket</td></tr>
            <tr><td><b>Speakers bureau agency fee</b></td><td className="muted">Included in the speaker fee</td><td className="r">{formatBps(r.speakerFeeBps)} of fee</td></tr>
            <tr><td><b>Verified certificate</b></td><td className="muted">Issuing expert</td><td className="r"><Taka minor={r.certificateFeeMinor} /> each</td></tr>
            <tr><td><b>Featured listing</b></td><td className="muted">Expert</td><td className="r"><Taka minor={r.boostFeeMinor} /> / 30 days</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
