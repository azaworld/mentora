import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { addPackage, buyBoost, buyExpertPlan, createWorkshop, downgradeToStarter, issueCertificate, removePackage, sendQuote, updateProfile } from "@/app/actions/expert";
import { Empty, Field, Flash, fmtDate, FORMAT_LABEL, Stat, Status, Taka } from "@/components/ui";
import { getDb } from "@/db";
import { certificates, experts, ledger, needs, organizations, packages, payouts, quotes, workshops } from "@/db/schema";
import { formatBps } from "@/lib/money";
import { canSellAndCertify, commissionBps, expertPlanFee, STREAM_LABELS } from "@/lib/revenue";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Expert dashboard" };

export default async function ExpertDashboard({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireRole("EXPERT", "/dashboard/expert");
  const db = getDb();
  const [me] = user.expertId ? await db.select().from(experts).where(eq(experts.id, user.expertId)) : [];
  if (!me) return <Empty>No expert profile is linked to this account. Contact support.</Empty>;

  const rates = await getSettings(db);
  const myCom = commissionBps(me.plan, rates);
  const [openNeeds, myQuotes, myWorkshops, myCerts, myLedger, [paid], myPackages] = await Promise.all([
    db
      .select({ need: needs, orgName: organizations.name })
      .from(needs)
      .innerJoin(organizations, eq(needs.orgId, organizations.id))
      .where(and(eq(needs.status, "OPEN"), or(isNull(needs.targetExpertId), eq(needs.targetExpertId, me.id))))
      .orderBy(desc(needs.createdAt)),
    db.select().from(quotes).where(eq(quotes.expertId, me.id)),
    db.select().from(workshops).where(eq(workshops.expertId, me.id)).orderBy(desc(workshops.startsAt)),
    db.select().from(certificates).where(eq(certificates.issuedById, me.id)).orderBy(desc(certificates.issuedAt)),
    db.select().from(ledger).where(eq(ledger.expertId, me.id)).orderBy(desc(ledger.createdAt)),
    db.select({ v: sql<number>`coalesce(sum(${payouts.amountMinor}),0)::int` }).from(payouts).where(eq(payouts.expertId, me.id)),
    db.select().from(packages).where(eq(packages.expertId, me.id)).orderBy(packages.sortOrder),
  ]);
  const earned = myLedger.reduce((s, t) => s + t.payoutMinor, 0);
  const balance = earned - (paid?.v ?? 0);
  const quoted = new Map(myQuotes.map((q) => [q.needId, q]));
  const approved = me.status === "APPROVED";
  const featured = me.featuredUntil && me.featuredUntil > new Date();

  return (
    <div className="dash">
      <nav className="side" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#profile">Profile</a>
        <a href="#leads">Leads &amp; proposals</a>
        <a href="#workshops">Workshops</a>
        <a href="#certificates">Certificates</a>
        <a href="#earnings">Earnings</a>
        <a href="#plan">Plan &amp; visibility</a>
      </nav>
      <div style={{ minWidth: 0 }}>
        <Flash ok={searchParams.ok} error={searchParams.error} />
        <section id="overview">
          <div className="dash-head">
            <div><div className="eyebrow">Expert dashboard</div><h2>Welcome, {me.name.split(" ")[0]}</h2></div>
            {approved && me.consentToList ? <Link className="btn btn-ghost btn-sm" href={`/experts/${me.slug}`}>View public profile</Link> : null}
          </div>
          {!approved ? <div className="note gold">Your profile is <Status value={me.status} />. It appears publicly once Mentora approves it.</div> : null}
          <div className="stats">
            <Stat highlight value={<Taka minor={earned} />} label="earnings after fees" />
            <Stat value={<Taka minor={balance} />} label="balance due to you" />
            <Stat value={openNeeds.filter((n) => !quoted.has(n.need.id)).length} label="open leads" />
            <Stat value={myCerts.length} label="certificates issued" />
          </div>
        </section>

        <section id="profile">
          <div className="dash-head"><h2>Profile</h2>{me.consentToList ? <span className="tag ok">Listed publicly when approved</span> : <span className="st bad">Hidden from the public</span>}</div>
          <form action={updateProfile} className="panel">
            <Field label="Headline" name="headline"><input id="headline" name="headline" defaultValue={me.headline} required minLength={5} maxLength={160} /></Field>
            <Field label="About you" name="bio"><textarea id="bio" name="bio" rows={5} defaultValue={me.bio} required minLength={20} maxLength={3000} /></Field>
            <div className="row2">
              <Field label="City" name="city"><input id="city" name="city" defaultValue={me.city} required /></Field>
              <Field label="Years of experience" name="yearsExperience"><input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={me.yearsExperience} required /></Field>
            </div>
            <Field label="Topics" name="topics" hint="Separate with commas, up to 8"><input id="topics" name="topics" defaultValue={me.topics.join(", ")} required /></Field>
            <div className="row2">
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="flabel">Languages</legend>
                {["Bangla", "English", "Hindi", "Arabic"].map((l) => (
                  <label key={l} className="check"><input type="checkbox" name={`lang_${l}`} defaultChecked={me.languages.includes(l)} /> {l}</label>
                ))}
              </fieldset>
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="flabel">Formats</legend>
                <label className="check"><input type="checkbox" name="online" defaultChecked={me.formats.includes("ONLINE")} /> Online</label>
                <label className="check"><input type="checkbox" name="onsite" defaultChecked={me.formats.includes("ONSITE")} /> Onsite</label>
              </fieldset>
            </div>
            <label className="check" style={{ margin: "8px 0 14px" }}><input type="checkbox" name="consentToList" defaultChecked={me.consentToList} /> Show my profile publicly on Mentora (you can withdraw this any time)</label>
            <button className="btn btn-primary btn-sm" type="submit">Save profile</button>
          </form>
          <h3 style={{ marginTop: 18 }}>Packages</h3>
          {myPackages.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Package</th><th>Unit</th><th className="r">Price</th><th></th></tr></thead>
              <tbody>{myPackages.map((p) => (
                <tr key={p.id}><td>{p.title}</td><td>{p.unit}</td><td className="r"><Taka minor={p.priceMinor} /></td>
                  <td><form action={removePackage}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm" type="submit">Remove</button></form></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No packages yet. Packages show your starting prices on your profile.</Empty>}
          <details className="form panel" style={{ marginTop: 12 }}>
            <summary>Add a package</summary>
            <form action={addPackage}>
              <Field label="Title" name="pkgTitle"><input id="pkgTitle" name="title" required minLength={3} placeholder="Full-day workshop" /></Field>
              <div className="row2">
                <Field label="Price (৳)" name="pkgPrice"><input id="pkgPrice" name="price" type="number" min={100} required /></Field>
                <Field label="Unit" name="pkgUnit"><input id="pkgUnit" name="unit" required placeholder="Per day" /></Field>
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Add package</button>
            </form>
          </details>
        </section>

        <section id="leads">
          <div className="dash-head"><h2>Leads &amp; proposals</h2><span className="small muted">Your commission: {formatBps(myCom)}</span></div>
          {openNeeds.length ? (
            openNeeds.map(({ need: n, orgName }) => {
              const q = quoted.get(n.id);
              return (
                <div className="need" key={n.id}>
                  <div className="need-h">
                    <div>
                      <h3>{n.title}</h3>
                      <div className="small muted">{orgName} · {n.participants} people · {FORMAT_LABEL[n.format]} · budget <Taka minor={n.budgetMinor} />{n.targetExpertId ? " · requested you directly" : ""}</div>
                    </div>
                    {q ? <Status value={q.status} /> : null}
                  </div>
                  <p className="small" style={{ margin: "8px 0 0" }}>{n.detail}</p>
                  {q ? (
                    <p className="small muted" style={{ margin: "6px 0 0" }}>Your proposal: <b><Taka minor={q.amountMinor} /></b></p>
                  ) : approved ? (
                    <details className="form">
                      <summary>Send a proposal</summary>
                      <form action={sendQuote}>
                        <input type="hidden" name="needId" value={n.id} />
                        <Field label="Your price (৳)" name={`amount-${n.id}`} hint={`You receive the price minus ${formatBps(myCom)} commission.`}>
                          <input id={`amount-${n.id}`} name="amount" type="number" min={1000} defaultValue={Math.round(n.budgetMinor / 100)} required />
                        </Field>
                        <Field label="Proposal summary" name={`message-${n.id}`}><textarea id={`message-${n.id}`} name="message" rows={3} required minLength={10} /></Field>
                        <button className="btn btn-primary btn-sm" type="submit">Send proposal</button>
                      </form>
                    </details>
                  ) : null}
                </div>
              );
            })
          ) : (
            <Empty>No open training needs right now.</Empty>
          )}
        </section>

        <section id="workshops">
          <div className="dash-head"><h2>Workshops</h2></div>
          {myWorkshops.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Workshop</th><th>Date</th><th>Status</th><th className="r">Seats sold</th><th className="r">Price</th></tr></thead>
              <tbody>{myWorkshops.map((w) => (
                <tr key={w.id}><td>{w.status === "PUBLISHED" ? <Link className="lnk" href={`/workshops/${w.id}`}>{w.title}</Link> : w.title}</td><td>{fmtDate(w.startsAt)}</td><td><Status value={w.status} /></td><td className="r">{w.seatsSold} / {w.seats}</td><td className="r"><Taka minor={w.priceMinor} /></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No workshops yet.</Empty>}
          {canSellAndCertify(me.plan) && approved ? (
            <details className="form panel" style={{ marginTop: 12 }}>
              <summary>Create a workshop</summary>
              <form action={createWorkshop}>
                <Field label="Title" name="title"><input id="title" name="title" required minLength={5} /></Field>
                <Field label="Summary" name="summary"><textarea id="summary" name="summary" rows={3} required minLength={10} /></Field>
                <div className="row2">
                  <Field label="Format" name="format"><select id="format" name="format"><option value="ONLINE">Online</option><option value="ONSITE">Onsite</option></select></Field>
                  <Field label="Start" name="startsAt"><input id="startsAt" name="startsAt" type="datetime-local" required /></Field>
                </div>
                <div className="row2">
                  <Field label="Duration" name="duration"><input id="duration" name="duration" defaultValue="1 day" required /></Field>
                  <Field label="Venue or link" name="venue"><input id="venue" name="venue" defaultValue="Dhaka" required /></Field>
                </div>
                <div className="row2">
                  <Field label="Price per seat (৳)" name="price" hint={`Platform fee ${formatBps(rates.workshopFeeBps)}`}><input id="price" name="price" type="number" min={100} defaultValue={5000} required /></Field>
                  <Field label="Seats" name="seats"><input id="seats" name="seats" type="number" min={1} defaultValue={25} required /></Field>
                </div>
                <button className="btn btn-primary btn-sm" type="submit">Submit for review</button>
              </form>
            </details>
          ) : <div className="note gold">Selling workshops is part of the Professional and Premier plans.</div>}
        </section>

        <section id="certificates">
          <div className="dash-head"><h2>Certificates</h2><span className="small muted"><Taka minor={rates.certificateFeeMinor} /> each</span></div>
          {myCerts.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Code</th><th>Holder</th><th>Program</th><th>Issued</th></tr></thead>
              <tbody>{myCerts.map((c) => (
                <tr key={c.id}><td><Link className="lnk code" href={`/verify?code=${c.code}`}>{c.code}</Link></td><td>{c.holderName}</td><td>{c.program}</td><td>{fmtDate(c.issuedAt)}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No certificates issued yet.</Empty>}
          {canSellAndCertify(me.plan) ? (
            <details className="form panel" style={{ marginTop: 12 }}>
              <summary>Issue a certificate</summary>
              <form action={issueCertificate}>
                <div className="row2">
                  <Field label="Participant name" name="holderName"><input id="holderName" name="holderName" required minLength={2} /></Field>
                  <Field label="Organization (optional)" name="orgName"><input id="orgName" name="orgName" /></Field>
                </div>
                <Field label="Program" name="program"><input id="program" name="program" required minLength={2} list="programs" /></Field>
                <datalist id="programs">
                  <option value="Certified AI-Ready Leader" />
                  {myWorkshops.map((w) => <option key={w.id} value={w.title} />)}
                </datalist>
                <button className="btn btn-primary btn-sm" type="submit">Continue to payment</button>
              </form>
            </details>
          ) : null}
        </section>

        <section id="earnings">
          <div className="dash-head"><h2>Earnings</h2></div>
          {myLedger.length ? (
            <div className="tw"><table className="t">
              <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="r">Gross</th><th className="r">Fees</th><th className="r">You receive</th></tr></thead>
              <tbody>{myLedger.map((t) => (
                <tr key={t.id}><td>{fmtDate(t.createdAt)}</td><td>{STREAM_LABELS[t.stream]}</td><td>{t.description}</td><td className="r"><Taka minor={t.grossMinor} /></td><td className="r"><Taka minor={t.platformMinor} /></td><td className="r"><Taka minor={t.payoutMinor} /></td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>No transactions yet.</Empty>}
        </section>

        <section id="plan">
          <div className="dash-head"><h2>Plan &amp; visibility</h2></div>
          <div className="plans">
            {(["STARTER", "PROFESSIONAL", "PREMIER"] as const).map((p) => (
              <div key={p} className={`plan${p === me.plan ? " cur" : ""}`}>
                {p === me.plan ? <span className="tag ok" style={{ alignSelf: "flex-start" }}>Current plan</span> : null}
                <h3 style={{ marginTop: 6 }}>{p[0] + p.slice(1).toLowerCase()}</h3>
                <div className="amt"><Taka minor={expertPlanFee(p, rates)} /> <small>/ month</small></div>
                <div className="com">{formatBps(commissionBps(p, rates))} commission</div>
                {p === me.plan ? null : p === "STARTER" ? (
                  <form action={downgradeToStarter}><button className="btn btn-ghost btn-block" type="submit">Switch to Starter</button></form>
                ) : (
                  <form action={buyExpertPlan}><input type="hidden" name="plan" value={p} /><button className="btn btn-primary btn-block" type="submit">Upgrade</button></form>
                )}
              </div>
            ))}
          </div>
          <div className="panel need-h">
            <div><h3>Featured listing</h3><p className="small muted" style={{ margin: 0 }}>Appear first in search and on the home page for 30 days.{featured ? ` Active until ${fmtDate(me.featuredUntil!)}.` : ""}</p></div>
            <form action={buyBoost}><button className="btn btn-gold btn-sm" type="submit" disabled={!approved}>{featured ? "Extend 30 days" : "Boost"} · <Taka minor={rates.boostFeeMinor} /></button></form>
          </div>
        </section>
      </div>
    </div>
  );
}
