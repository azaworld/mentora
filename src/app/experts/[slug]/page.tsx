import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { postNeed } from "@/app/actions/org";
import { WorkshopRow } from "@/components/cards";
import { Avatar, BackLink, Field, Flash, FORMAT_LABEL, ROLE_LABEL, Taka } from "@/components/ui";
import { getPublicExpert } from "@/lib/queries";
import { currentUser } from "@/lib/session";

type Props = { params: { slug: string }; searchParams: Record<string, string | undefined> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicExpert(params.slug);
  return data ? { title: data.expert.name, description: data.expert.headline } : { title: "Expert not found" };
}

export default async function ExpertPage({ params, searchParams }: Props) {
  const [data, user] = await Promise.all([getPublicExpert(params.slug), currentUser()]);
  if (!data) notFound();
  const { expert: e, featured, packages, workshops } = data;
  const minPrice = packages.length ? Math.min(...packages.map((p) => p.priceMinor)) : null;
  const here = `/experts/${e.slug}`;

  return (
    <>
      <BackLink href="/experts">All experts</BackLink>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <div className="split">
        <div>
          <div className="who" style={{ gap: 18 }}>
            <Avatar name={e.name} seed={e.id} large />
            <div>
              <h1 style={{ fontSize: "clamp(28px,4vw,40px)", margin: 0 }}>{e.name}</h1>
              <div className="muted">{e.headline}</div>
              <div className="tags" style={{ marginTop: 8 }}>
                <span className="tag role">{ROLE_LABEL[e.role]}</span>
                {featured ? <span className="tag gold">Featured</span> : null}
                {e.plan !== "STARTER" ? <span className="tag ok">Verified</span> : null}
                {e.isSample ? <span className="tag sample">Sample profile</span> : null}
              </div>
            </div>
          </div>
          <h3 style={{ marginTop: 22 }}>About</h3>
          <p style={{ whiteSpace: "pre-line" }}>{e.bio}</p>
          <h3>Topics</h3>
          <div className="tags">
            {e.topics.map((t) => <span className="tag" key={t}>{t}</span>)}
          </div>
          {packages.length ? (
            <>
              <h3 style={{ marginTop: 22 }}>Packages</h3>
              <div className="pkgs">
                {packages.map((p) => (
                  <div className="pkg" key={p.id}>
                    <b>{p.title}</b>
                    <div className="amt"><Taka minor={p.priceMinor} /></div>
                    <div className="small muted">{p.unit}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {workshops.length ? (
            <>
              <h3>Upcoming workshops</h3>
              {workshops.map((w) => <WorkshopRow key={w.id} workshop={w} expert={{ name: e.name, slug: e.slug }} />)}
            </>
          ) : null}
        </div>

        <aside className="panel sticky" id="request">
          <div className="eyebrow">Request a proposal</div>
          <dl className="small" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "4px 12px", margin: "0 0 14px" }}>
            <dt className="muted">Rating</dt><dd style={{ margin: 0 }}>{e.reviewCount ? `★ ${e.rating.toFixed(1)} (${e.reviewCount})` : "New on Mentora"}</dd>
            <dt className="muted">Starting at</dt><dd style={{ margin: 0 }}>{minPrice ? <Taka minor={minPrice} /> : "On request"}</dd>
            <dt className="muted">Formats</dt><dd style={{ margin: 0 }}>{e.formats.map((f) => FORMAT_LABEL[f]).join(", ")}</dd>
            <dt className="muted">Languages</dt><dd style={{ margin: 0 }}>{e.languages.join(", ")}</dd>
          </dl>
          {user?.role === "ORG" ? (
            <form action={postNeed}>
              <input type="hidden" name="targetExpertId" value={e.id} />
              <input type="hidden" name="returnTo" value={here} />
              <Field label="What do you need?" name="title"><input id="title" name="title" required minLength={5} maxLength={160} /></Field>
              <Field label="Details" name="detail"><textarea id="detail" name="detail" rows={3} required minLength={10} /></Field>
              <div className="row2">
                <Field label="Participants" name="participants"><input id="participants" name="participants" type="number" min={1} defaultValue={20} required /></Field>
                <Field label="Budget (৳)" name="budget"><input id="budget" name="budget" type="number" min={1000} required /></Field>
              </div>
              <Field label="Format" name="format">
                <select id="format" name="format" defaultValue="EITHER"><option value="ONSITE">Onsite</option><option value="ONLINE">Online</option><option value="EITHER">Either</option></select>
              </Field>
              <button className="btn btn-primary btn-block" type="submit">Send request</button>
            </form>
          ) : (
            <>
              <p className="small muted">Organizations request proposals from their Mentora account. Contracts, invoicing and payment run through Mentora.</p>
              <Link className="btn btn-primary btn-block" href={`/login?next=${encodeURIComponent(here)}`}>Sign in to request</Link>
              <Link className="btn btn-ghost btn-block" style={{ marginTop: 8 }} href="/signup?type=org">Create an organization account</Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
