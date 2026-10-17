import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { acceptQuote, buyOrgPlan, postNeed } from "@/app/actions/org";
import { Empty, Field, Flash, fmtDate, FORMAT_LABEL, Stat, Status, Taka } from "@/components/ui";
import { getDb } from "@/db";
import { bookings, certificates, experts, ledger, needs, organizations, quotes } from "@/db/schema";
import { formatBps } from "@/lib/money";
import { orgBookingPrice, orgPlanFee } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Organization dashboard" };

const PLAN_NAME = { PAYG: "Pay as you go", PARTNER: "L&D Partner", ENTERPRISE: "Enterprise academy" } as const;

export default async function OrgDashboard({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireRole("ORG", "/dashboard/org");
  const db = getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!));
  if (!org) return <Empty>Organization not found.</Empty>;
  const rates = await getSettings(db);

  const myNeeds = await db.select().from(needs).where(eq(needs.orgId, org.id)).orderBy(desc(needs.createdAt));
  const needIds = myNeeds.map((n) => n.id);
  const [props, myBookings, spend, certs] = await Promise.all([
    needIds.length
      ? db.select({ quote: quotes, expert: { name: experts.name, slug: experts.slug, rating: experts.rating, reviewCount: experts.reviewCount } }).from(quotes).innerJoin(experts, eq(quotes.expertId, experts.id)).where(inArray(quotes.needId, needIds))
      : Promise.resolve([]),
    db.select({ booking: bookings, expertName: experts.name, title: needs.title }).from(bookings).innerJoin(experts, eq(bookings.expertId, experts.id)).innerJoin(needs, eq(bookings.needId, needs.id)).where(eq(bookings.orgId, org.id)).orderBy(desc(bookings.createdAt)),
    db.select().from(ledger).where(eq(ledger.orgId, org.id)).orderBy(desc(ledger.createdAt)),
    db.select().from(certificates).where(eq(certificates.orgName, org.name)).orderBy(desc(certificates.issuedAt)),
  ]);
  const waiting = props.filter((p) => p.quote.status === "SENT").length;

  return (
    <div className="dash">
      <nav className="side" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#needs">Needs &amp; proposals</a>
        <a href="#bookings">Bookings</a>
        <a href="#certificates">Certificates</a>
        <a href="#plan">Plan</a>
      </nav>
      <div style={{ minWidth: 0 }}>
        <Flash ok={searchParams.ok} error={searchParams.error} />
        <section id="overview">
          <div className="dash-head"><div><div className="eyebrow">Organization dashboard</div><h2>{org.name}</h2></div><span className="tag role">{PLAN_NAME[org.plan]}</span></div>
          <div className="stats">
            <Stat highlight value={<Taka minor={spend.reduce((s, t) => s + t.grossMinor, 0)} />} label="spent through Mentora" />
            <Stat value={myBookings.length} label="bookings" />
            <Stat value={waiting} label="proposals to review" />
            <Stat value={certs.length} label="employees certified" />
          </div>
        </section>

        <section id="needs">
          <div className="dash-head"><h2>Needs &amp; proposals</h2></div>
          <details className="form panel" style={{ marginBottom: 14 }} open={!myNeeds.length}>
            <summary>Post a training need</summary>
            <form action={postNeed}>
              <Field label="What do you need?" name="title"><input id="title" name="title" required minLength={5} placeholder="Leadership program for 40 branch managers" /></Field>
              <Field label="Details" name="detail"><textarea id="detail" name="detail" rows={3} required minLength={10} /></Field>
              <div className="row2">
                <Field label="Participants" name="participants"><input id="participants" name="participants" type="number" min={1} defaultValue={20} required /></Field>
                <Field label="Budget (৳)" name="budget"><input id="budget" name="budget" type="number" min={1000} required /></Field>
              </div>
              <Field label="Format" name="format"><select id="format" name="format" defaultValue="EITHER"><option value="ONSITE">Onsite</option><option value="ONLINE">Online</option><option value="EITHER">Either</option></select></Field>
              <button className="btn btn-primary btn-sm" type="submit">Post need</button>
            </form>
          </details>
          {myNeeds.length ? myNeeds.map((n) => {
            const qs = props.filter((p) => p.quote.needId === n.id);
            return (
              <div className="need" key={n.id}>
                <div className="need-h">
                  <div><h3>{n.title}</h3><div className="small muted">Posted {fmtDate(n.createdAt)} · {n.participants} people · {FORMAT_LABEL[n.format]} · budget <Taka minor={n.budgetMinor} /></div></div>
                  <Status value={n.status} />
                </div>
                {qs.length ? (
                  <div className="tw" style={{ marginTop: 12 }}><table className="t">
                    <thead><tr><th>Expert</th><th>Proposal</th><th className="r">Price</th><th>Action</th></tr></thead>
                    <tbody>{qs.map(({ quote: q, expert: e }) => {
                      const price = orgBookingPrice(q.amountMinor, org.plan, rates);
                      return (
                        <tr key={q.id}>
                          <td><Link className="lnk" href={`/experts/${e.slug}`}>{e.name}</Link><div className="small muted">{e.reviewCount ? `★ ${e.rating.toFixed(1)}` : "New"}</div></td>
                          <td className="small">{q.message}</td>
                          <td className="r"><Taka minor={price} />{price !== q.amountMinor ? <div className="small muted">plan discount applied</div> : null}</td>
                          <td>{q.status === "SENT" && n.status === "OPEN" ? (
                            <form action={acceptQuote}><input type="hidden" name="quoteId" value={q.id} /><button className="btn btn-ok btn-sm" type="submit">Accept &amp; pay</button></form>
                          ) : <Status value={q.status} />}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table></div>
                ) : <p className="small muted" style={{ margin: "10px 0 0" }}>Waiting for proposals. Experts usually reply within 48 hours.</p>}
              </div>
            );
          }) : null}
        </section>

        <section id="bookings">
          <div className="dash-head"><h2>Bookings</h2></div>
          {myBookings.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Program</th><th>Expert</th><th>Booked</th><th className="r">Amount</th><th>Status</th></tr></thead>
              <tbody>{myBookings.map((b) => (
                <tr key={b.booking.id}><td>{b.title}</td><td>{b.expertName}</td><td>{fmtDate(b.booking.createdAt)}</td><td className="r"><Taka minor={b.booking.amountMinor} /></td><td><Status value={b.booking.status} /></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No bookings yet.</Empty>}
        </section>

        <section id="certificates">
          <div className="dash-head"><h2>Certificates</h2></div>
          {certs.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Code</th><th>Employee</th><th>Program</th><th>Issued</th></tr></thead>
              <tbody>{certs.map((c) => (
                <tr key={c.id}><td><Link className="lnk code" href={`/verify?code=${c.code}`}>{c.code}</Link></td><td>{c.holderName}</td><td>{c.program}</td><td>{fmtDate(c.issuedAt)}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No certificates yet.</Empty>}
        </section>

        <section id="plan">
          <div className="dash-head"><h2>Plan</h2></div>
          <div className="plans">
            {(["PAYG", "PARTNER", "ENTERPRISE"] as const).map((p) => (
              <div key={p} className={`plan${p === org.plan ? " cur" : ""}`}>
                {p === org.plan ? <span className="tag ok" style={{ alignSelf: "flex-start" }}>Current plan</span> : null}
                <h3 style={{ marginTop: 6 }}>{PLAN_NAME[p]}</h3>
                <div className="amt"><Taka minor={orgPlanFee(p, rates)} /> <small>{p === "PAYG" ? "" : "/ year"}</small></div>
                <div className="com">{p === "PAYG" ? "Standard prices" : `${formatBps(rates.partnerDiscountBps)} off all bookings`}</div>
                {p !== org.plan && p !== "PAYG" ? (
                  <form action={buyOrgPlan}><input type="hidden" name="plan" value={p} /><button className="btn btn-primary btn-block" type="submit">Choose {PLAN_NAME[p]}</button></form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
