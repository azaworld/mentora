import Link from "next/link";
import { notFound } from "next/navigation";
import { startTicketCheckout } from "@/app/actions/public";
import { Avatar, BackLink, Field, Flash, fmtDate, FORMAT_LABEL, ROLE_LABEL, Taka } from "@/components/ui";
import { getPublicWorkshop } from "@/lib/queries";

type Props = { params: { id: string }; searchParams: Record<string, string | undefined> };

export async function generateMetadata({ params }: Props) {
  const r = await getPublicWorkshop(params.id);
  return { title: r ? r.workshop.title : "Workshop not found" };
}

export default async function WorkshopPage({ params, searchParams }: Props) {
  const row = await getPublicWorkshop(params.id);
  if (!row) notFound();
  const { workshop: w, expert: e } = row;
  const left = w.seats - w.seatsSold;
  const pct = Math.round((w.seatsSold / w.seats) * 100);
  return (
    <>
      <BackLink href="/workshops">All workshops</BackLink>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <div className="split">
        <div>
          <div className="eyebrow">{FORMAT_LABEL[w.format]} workshop</div>
          <h1 style={{ fontSize: "clamp(28px,4vw,42px)" }}>{w.title}</h1>
          <p className="lead">{w.duration} · starts {fmtDate(w.startsAt)} · {w.venue}</p>
          <p style={{ whiteSpace: "pre-line" }}>{w.summary}</p>
          <h3 style={{ marginTop: 22 }}>Facilitator</h3>
          <div className="who">
            <Avatar name={e.name} seed={e.id} />
            <div><h3><Link href={`/experts/${e.slug}`}>{e.name}</Link></h3><small>{ROLE_LABEL[e.role]} · {e.yearsExperience} yrs experience</small></div>
          </div>
          <ul className="list" style={{ marginTop: 18 }}>
            <li>E-ticket by email after payment</li>
            <li>{w.format === "ONLINE" ? "Live online room link before the session" : "Venue details before the session"}</li>
            <li>Verified certificate on completion</li>
          </ul>
        </div>
        <aside className="panel sticky">
          <div className="price" style={{ textAlign: "left", fontSize: 32 }}><Taka minor={w.priceMinor} /><small>per seat</small></div>
          <div style={{ height: 6, background: "var(--soft)", borderRadius: 999, overflow: "hidden", margin: "14px 0 6px" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal)" }} />
          </div>
          <div className="small muted" style={{ marginBottom: 14 }}>{w.seatsSold} of {w.seats} seats taken</div>
          {left > 0 ? (
            <form action={startTicketCheckout}>
              <input type="hidden" name="workshopId" value={w.id} />
              <Field label="Full name" name="name"><input id="name" name="name" required minLength={2} autoComplete="name" /></Field>
              <Field label="Email" name="email"><input id="email" name="email" type="email" required autoComplete="email" /></Field>
              <Field label="Mobile number" name="phone"><input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="01XXXXXXXXX" /></Field>
              <Field label="Seats" name="seats" hint={`${left} left`}><input id="seats" name="seats" type="number" min={1} max={Math.min(left, 50)} defaultValue={1} required /></Field>
              <button className="btn btn-gold btn-block" type="submit">Continue to payment</button>
              <p className="small muted" style={{ margin: "10px 0 0" }}>Pay securely by bKash, Nagad, Rocket or card.</p>
            </form>
          ) : (
            <p className="low">This workshop is sold out.</p>
          )}
        </aside>
      </div>
    </>
  );
}
