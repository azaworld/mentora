import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import {
  markProgramPaid,
  markRefunded,
  revokeCertificate,
  markSpeakerPaid,
  quoteSpeakerRequest,
  recordPayout,
  saveSettings,
  sellSponsorship,
  setExpertStatus,
  setWorkshopStatus,
} from "@/app/actions/admin";
import { Empty, Field, Flash, fmtDate, ROLE_LABEL, Stat, Status, Taka } from "@/components/ui";
import { getDb } from "@/db";
import { experts, ledger, orders, payouts, programRequests, speakerRequests, speakers, sponsorships, workshops } from "@/db/schema";
import { formatBps, formatTaka } from "@/lib/money";
import { aiPackagePrice, STREAM_LABELS } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Admin" };

export default async function AdminDashboard({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await requireRole("ADMIN", "/dashboard/admin");
  const db = getDb();
  const rates = await getSettings(db);

  const [totals] = await db
    .select({
      gross: sql<number>`coalesce(sum(${ledger.grossMinor}),0)::int`,
      payout: sql<number>`coalesce(sum(${ledger.payoutMinor}),0)::int`,
      platform: sql<number>`coalesce(sum(${ledger.platformMinor}),0)::int`,
      operator: sql<number>`coalesce(sum(${ledger.operatorMinor}),0)::int`,
      tech: sql<number>`coalesce(sum(${ledger.techPartnerMinor}),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(ledger);
  const [byStream, pendingExperts, pendingWorkshops, sreqs, preqs, spons, balances, recent, refunds] = await Promise.all([
    db.select({ stream: ledger.stream, v: sql<number>`sum(${ledger.platformMinor})::int` }).from(ledger).groupBy(ledger.stream),
    db.select().from(experts).where(eq(experts.status, "PENDING")).orderBy(desc(experts.createdAt)),
    db.select({ ws: workshops, expertName: experts.name }).from(workshops).innerJoin(experts, eq(workshops.expertId, experts.id)).where(eq(workshops.status, "PENDING_REVIEW")),
    db.select({ req: speakerRequests, speakerName: speakers.name }).from(speakerRequests).innerJoin(speakers, eq(speakerRequests.speakerId, speakers.id)).orderBy(desc(speakerRequests.createdAt)).limit(50),
    db.select().from(programRequests).orderBy(desc(programRequests.createdAt)).limit(50),
    db.select().from(sponsorships),
    db.execute<{ id: string; name: string; earned: number; paid: number }>(sql`
      select e.id, e.name,
        coalesce((select sum(l.payout_minor) from ${ledger} l where l.expert_id = e.id), 0)::int as earned,
        coalesce((select sum(p.amount_minor) from ${payouts} p where p.expert_id = e.id), 0)::int as paid
      from ${experts} e`),
    db.select().from(ledger).orderBy(desc(ledger.createdAt)).limit(30),
    db.select().from(orders).where(eq(orders.status, "NEEDS_REFUND")).orderBy(desc(orders.createdAt)),
  ]);
  const streams = byStream.filter((s) => s.v > 0).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...streams.map((s) => s.v));
  const owed = balances.rows.filter((r) => r.earned - r.paid > 0);
  const t = totals!;

  return (
    <div className="dash">
      <nav className="side" aria-label="Admin sections">
        <a href="#overview">Revenue</a>
        <a href="#approvals">Approvals</a>
        <a href="#speakers">Speaker pipeline</a>
        <a href="#programs">AI for Leaders</a>
        <a href="#sponsorship">Sponsorship</a>
        <a href="#payouts">Payouts</a>
        <a href="#certificates">Certificates</a>
        <a href="#ledger">Ledger</a>
        <a href="#settings">Fees &amp; split</a>
      </nav>
      <div style={{ minWidth: 0 }}>
        <Flash ok={searchParams.ok} error={searchParams.error} />
        <section id="overview">
          <div className="dash-head"><div><div className="eyebrow">Admin</div><h2>Revenue overview</h2></div></div>
          <div className="stats">
            <Stat value={<Taka minor={t.gross} />} label="gross transaction value" />
            <Stat highlight value={<Taka minor={t.platform} />} label="platform revenue" />
            <Stat value={<Taka minor={t.payout} />} label="paid out to experts & speakers" />
            <Stat value={t.count} label="transactions" />
          </div>
          <div className="g2" style={{ marginTop: 16 }}>
            <div className="panel">
              <h3>Platform revenue by stream</h3>
              {streams.length ? (
                <div className="bars">
                  {streams.map((s) => (
                    <div className="bar-row" key={s.stream}>
                      <span>{STREAM_LABELS[s.stream]}</span>
                      <span className="trk"><span className="fill" style={{ width: `${Math.max(2, (s.v / max) * 100)}%` }} /></span>
                      <span className="val">{formatTaka(s.v)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="muted small">No revenue yet.</p>}
            </div>
            <div className="panel">
              <h3>Partner split</h3>
              <div className="splitbar" role="img" aria-label={`Operator ${formatBps(10000 - rates.techPartnerBps)}, tech partner ${formatBps(rates.techPartnerBps)}`}>
                <div style={{ width: `${(10000 - rates.techPartnerBps) / 100}%`, background: "var(--bar)" }} />
                <div style={{ width: `${rates.techPartnerBps / 100}%`, background: "var(--gold-btn)" }} />
              </div>
              <div className="legend">
                <span><i style={{ background: "var(--bar)" }} />Operator · <b><Taka minor={t.operator} /></b></span>
                <span><i style={{ background: "var(--gold-btn)" }} />Tech partner · <b><Taka minor={t.tech} /></b></span>
              </div>
              <p className="small muted" style={{ margin: "10px 0 0" }}>Current rate {formatBps(rates.techPartnerBps)} to the tech partner. Each entry keeps the rate it was posted with.</p>
            </div>
          </div>
          {refunds.length ? (
            <div className="panel" style={{ marginTop: 16, borderColor: "var(--bad)" }}>
              <h3 style={{ color: "var(--bad)" }}>Refunds to make ({refunds.length})</h3>
              <div className="tw"><table className="t">
                <thead><tr><th>Reference</th><th>Buyer</th><th>Reason</th><th className="r">Amount</th><th>Record refund</th></tr></thead>
                <tbody>{refunds.map((o) => (
                  <tr key={o.id}><td className="code">{o.tranId}</td><td>{o.email}</td><td className="small">{o.failReason}</td><td className="r"><Taka minor={o.amountMinor} /></td>
                    <td><form action={markRefunded} className="inline-form"><input type="hidden" name="id" value={o.id} /><input className="input" name="reference" placeholder="Refund reference" required aria-label="Refund reference" /><button className="btn btn-primary btn-sm" type="submit">Mark refunded</button></form></td></tr>
                ))}</tbody>
              </table></div>
            </div>
          ) : null}
        </section>

        <section id="approvals">
          <div className="dash-head"><h2>Approvals</h2></div>
          <h3>Expert profiles</h3>
          {pendingExperts.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Name</th><th>Role</th><th>Headline</th><th>Consent</th><th>Action</th></tr></thead>
              <tbody>{pendingExperts.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td><td>{ROLE_LABEL[e.role]}</td><td className="small">{e.headline}</td>
                  <td>{e.consentToList ? <Status value="CONFIRMED" /> : <span className="st bad">Not given</span>}</td>
                  <td><div className="inline-form">
                    <form action={setExpertStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="APPROVED" /><button className="btn btn-ok btn-sm" type="submit" disabled={!e.consentToList} title={e.consentToList ? undefined : "Needs the expert's written consent first"}>Approve</button></form>
                    <form action={setExpertStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="REJECTED" /><button className="btn btn-ghost btn-sm" type="submit">Reject</button></form>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No profiles waiting.</Empty>}
          <h3 style={{ marginTop: 18 }}>Workshops</h3>
          {pendingWorkshops.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Workshop</th><th>Expert</th><th>Date</th><th className="r">Price</th><th>Action</th></tr></thead>
              <tbody>{pendingWorkshops.map(({ ws, expertName }) => (
                <tr key={ws.id}><td>{ws.title}</td><td>{expertName}</td><td>{fmtDate(ws.startsAt)}</td><td className="r"><Taka minor={ws.priceMinor} /></td>
                  <td><div className="inline-form">
                    <form action={setWorkshopStatus}><input type="hidden" name="id" value={ws.id} /><input type="hidden" name="status" value="PUBLISHED" /><button className="btn btn-ok btn-sm" type="submit">Publish</button></form>
                    <form action={setWorkshopStatus}><input type="hidden" name="id" value={ws.id} /><input type="hidden" name="status" value="REJECTED" /><button className="btn btn-ghost btn-sm" type="submit">Reject</button></form>
                  </div></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No workshops waiting.</Empty>}
        </section>

        <section id="speakers">
          <div className="dash-head"><h2>Speaker pipeline</h2><span className="small muted">Agency fee {formatBps(rates.speakerFeeBps)}</span></div>
          {sreqs.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Organization</th><th>Speaker</th><th>Event</th><th className="r">Fee</th><th>Stage</th><th>Action</th></tr></thead>
              <tbody>{sreqs.map(({ req: r, speakerName }) => (
                <tr key={r.id}>
                  <td>{r.orgName}<div className="small muted">{r.email}</div></td><td>{speakerName}</td>
                  <td>{r.eventType}<div className="small muted">{fmtDate(r.eventDate)} · {r.audience} people</div></td>
                  <td className="r">{r.quoteMinor ? <Taka minor={r.quoteMinor} /> : "—"}</td><td><Status value={r.stage} /></td>
                  <td>{r.stage === "REQUESTED" ? (
                    <form action={quoteSpeakerRequest} className="inline-form"><input type="hidden" name="id" value={r.id} /><input className="input" name="amount" type="number" min={1000} placeholder="Fee ৳" required aria-label="Speaker fee in taka" /><button className="btn btn-primary btn-sm" type="submit">Quote</button></form>
                  ) : r.stage === "QUOTED" ? (
                    <form action={markSpeakerPaid}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ok btn-sm" type="submit">Mark paid</button></form>
                  ) : null}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No speaker requests yet.</Empty>}
        </section>

        <section id="programs">
          <div className="dash-head"><h2>AI for Leaders requests</h2><span className="small muted">Facilitator share {formatBps(rates.aiFacilitatorBps)}</span></div>
          {preqs.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Organization</th><th>Package</th><th>Leaders</th><th className="r">Price</th><th>Stage</th><th>Action</th></tr></thead>
              <tbody>{preqs.map((r) => (
                <tr key={r.id}><td>{r.orgName}<div className="small muted">{r.email}</div></td><td>{r.package === "EXECUTIVE_BRIEFING" ? "Executive briefing" : "One-day intensive"}</td><td>{r.leaders}</td>
                  <td className="r"><Taka minor={aiPackagePrice(r.package, rates)} /></td><td><Status value={r.stage} /></td>
                  <td>{r.stage === "REQUESTED" || r.stage === "CONFIRMED" ? <form action={markProgramPaid}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ok btn-sm" type="submit">Mark paid</button></form> : null}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No program requests yet.</Empty>}
        </section>

        <section id="sponsorship">
          <div className="dash-head"><h2>Sponsorship</h2></div>
          {spons.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Package</th><th className="r">Price</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{spons.map((s) => (
                <tr key={s.id}><td>{s.name}</td><td className="r"><Taka minor={s.priceMinor} /></td><td>{s.soldAt ? <span className="st mute">Sold to {s.soldTo}</span> : <Status value="OPEN" />}</td>
                  <td>{s.soldAt ? null : <form action={sellSponsorship} className="inline-form"><input type="hidden" name="id" value={s.id} /><input className="input" name="soldTo" placeholder="Sponsor name" required aria-label="Sponsor name" /><button className="btn btn-primary btn-sm" type="submit">Record sale</button></form>}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No sponsorship packages.</Empty>}
        </section>

        <section id="payouts">
          <div className="dash-head"><h2>Payouts</h2></div>
          {owed.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Expert</th><th className="r">Earned</th><th className="r">Paid</th><th className="r">Balance</th><th>Record payout</th></tr></thead>
              <tbody>{owed.map((r) => (
                <tr key={r.id}><td>{r.name}</td><td className="r"><Taka minor={r.earned} /></td><td className="r"><Taka minor={r.paid} /></td><td className="r"><b><Taka minor={r.earned - r.paid} /></b></td>
                  <td><form action={recordPayout} className="inline-form"><input type="hidden" name="expertId" value={r.id} /><input className="input" name="amount" type="number" min={1} step="0.01" defaultValue={((r.earned - r.paid) / 100).toFixed(2)} aria-label="Amount in taka" required /><input className="input" name="reference" placeholder="Bank or bKash ref" aria-label="Payment reference" /><button className="btn btn-primary btn-sm" type="submit">Record</button></form></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>Nothing owed right now.</Empty>}
        </section>

        <section id="certificates">
          <div className="dash-head"><h2>Certificates</h2></div>
          <form action={revokeCertificate} className="panel inline-form">
            <label className="flabel" htmlFor="revokeCode" style={{ margin: 0 }}>Revoke a certificate</label>
            <input className="input" id="revokeCode" name="code" placeholder="MN-2026-XXXXXXXX" required style={{ fontFamily: "ui-monospace, Menlo, monospace" }} />
            <button className="btn btn-ghost btn-sm" type="submit">Revoke</button>
            <span className="small muted">Revoked certificates show as revoked on the public verification page.</span>
          </form>
        </section>

        <section id="ledger">
          <div className="dash-head"><h2>Ledger</h2><Link className="btn btn-ghost btn-sm" href="/api/admin/ledger">Download CSV</Link></div>
          {recent.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Date</th><th>Stream</th><th>Description</th><th className="r">Gross</th><th className="r">Payout</th><th className="r">Platform</th></tr></thead>
              <tbody>{recent.map((l) => (
                <tr key={l.id}><td>{fmtDate(l.createdAt)}</td><td>{STREAM_LABELS[l.stream]}</td><td>{l.description}</td><td className="r"><Taka minor={l.grossMinor} /></td><td className="r"><Taka minor={l.payoutMinor} /></td><td className="r"><Taka minor={l.platformMinor} /></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No transactions yet.</Empty>}
        </section>

        <section id="settings">
          <div className="dash-head"><h2>Fees &amp; split</h2></div>
          <form action={saveSettings} className="panel">
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12 }}>
              {([
                ["starterFee", "Starter fee (৳/month)", rates.starterFeeMinor / 100],
                ["professionalFee", "Professional fee (৳/month)", rates.professionalFeeMinor / 100],
                ["premierFee", "Premier fee (৳/month)", rates.premierFeeMinor / 100],
                ["starterCommission", "Starter commission (%)", rates.starterCommissionBps / 100],
                ["professionalCommission", "Professional commission (%)", rates.professionalCommissionBps / 100],
                ["premierCommission", "Premier commission (%)", rates.premierCommissionBps / 100],
                ["workshopFee", "Workshop platform fee (%)", rates.workshopFeeBps / 100],
                ["speakerFee", "Speaker agency fee (%)", rates.speakerFeeBps / 100],
                ["aiFacilitator", "AI for Leaders facilitator share (%)", rates.aiFacilitatorBps / 100],
                ["certificateFee", "Certificate fee (৳)", rates.certificateFeeMinor / 100],
                ["boostFee", "Featured listing (৳ / 30 days)", rates.boostFeeMinor / 100],
                ["partnerPlanFee", "L&D Partner plan (৳/year)", rates.partnerPlanFeeMinor / 100],
                ["enterprisePlanFee", "Enterprise plan (৳/year)", rates.enterprisePlanFeeMinor / 100],
                ["partnerDiscount", "Plan booking discount (%)", rates.partnerDiscountBps / 100],
                ["aiBriefingPrice", "AI executive briefing (৳)", rates.aiBriefingPriceMinor / 100],
                ["aiOneDayPrice", "AI one-day intensive (৳)", rates.aiOneDayPriceMinor / 100],
                ["techPartner", "Tech partner share of platform revenue (%)", rates.techPartnerBps / 100],
              ] as const).map(([name, label, value]) => (
                <Field key={name} label={label} name={name}><input id={name} name={name} type="number" min={0} step="any" defaultValue={value} required /></Field>
              ))}
            </div>
            <button className="btn btn-primary" type="submit">Save settings</button>
            <p className="small muted" style={{ margin: "10px 0 0" }}>New rates apply to new transactions only.</p>
          </form>
        </section>
      </div>
    </div>
  );
}
