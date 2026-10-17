import { notFound } from "next/navigation";
import { requestSpeaker } from "@/app/actions/public";
import { Avatar, BackLink, Field, Flash, TIER_LABEL, Taka } from "@/components/ui";
import { getPublicSpeaker } from "@/lib/queries";

type Props = { params: { slug: string }; searchParams: Record<string, string | undefined> };

export async function generateMetadata({ params }: Props) {
  const s = await getPublicSpeaker(params.slug);
  return { title: s ? s.name : "Speaker not found" };
}

export default async function SpeakerPage({ params, searchParams }: Props) {
  const s = await getPublicSpeaker(params.slug);
  if (!s) notFound();
  return (
    <>
      <BackLink href="/speakers">All speakers</BackLink>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <div className="split">
        <div>
          <div className="who" style={{ gap: 18 }}>
            <Avatar name={s.name} seed={s.id} large />
            <div>
              <h1 style={{ fontSize: "clamp(28px,4vw,40px)", margin: 0 }}>{s.name}</h1>
              <div className="muted">{s.title}</div>
              <div className="tags" style={{ marginTop: 8 }}>
                <span className="tag gold">{TIER_LABEL[s.tier]} tier</span>
                {s.isSample ? <span className="tag sample">Sample profile</span> : null}
              </div>
            </div>
          </div>
          <h3 style={{ marginTop: 22 }}>Signature talks</h3>
          <ul className="list">
            {s.topics.map((t) => (
              <li key={t}><b>{t}</b><div className="small muted">Keynote, 30–45 minutes, with audience Q&amp;A</div></li>
            ))}
          </ul>
          <h3>Formats</h3>
          <div className="tags">{["Keynote", "Panel", "Fireside chat", "Leadership retreat", "Online session"].map((f) => <span className="tag" key={f}>{f}</span>)}</div>
        </div>
        <aside className="panel sticky">
          <div className="eyebrow">Check availability</div>
          <p className="small muted">Fee: {s.feeFromMinor ? <>from <Taka minor={s.feeFromMinor} /></> : "on request"}. Mentora confirms availability and sends a quote.</p>
          <form action={requestSpeaker}>
            <input type="hidden" name="speakerId" value={s.id} />
            <input type="hidden" name="slug" value={s.slug} />
            <Field label="Organization" name="orgName"><input id="orgName" name="orgName" required minLength={2} /></Field>
            <Field label="Work email" name="email"><input id="email" name="email" type="email" required /></Field>
            <Field label="Event type" name="eventType">
              <select id="eventType" name="eventType">
                {["Conference keynote", "Leadership retreat", "Town hall", "Panel discussion", "Online session"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <div className="row2">
              <Field label="Audience size" name="audience"><input id="audience" name="audience" type="number" min={5} defaultValue={100} required /></Field>
              <Field label="Event date" name="eventDate"><input id="eventDate" name="eventDate" type="date" required /></Field>
            </div>
            <button className="btn btn-primary btn-block" type="submit">Send enquiry</button>
          </form>
        </aside>
      </div>
    </>
  );
}
