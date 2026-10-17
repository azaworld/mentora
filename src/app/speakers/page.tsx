import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Empty, TIER_LABEL, Taka } from "@/components/ui";
import { listSpeakers } from "@/lib/queries";

export const metadata: Metadata = { title: "Speakers bureau" };

const TIERS = [["", "All speakers"], ["ICON", "Icon tier"], ["EXECUTIVE", "CEOs & MDs"], ["EXPERT", "Experts"]] as const;

export default async function SpeakersPage({ searchParams }: { searchParams: { tier?: string } }) {
  const tier = searchParams.tier ?? "";
  const list = await listSpeakers(tier);
  return (
    <>
      <div className="eyebrow">Speakers bureau</div>
      <h2>Keynote speakers for conferences, town halls and leadership retreats</h2>
      <p className="lead">From national icons to sitting CEOs and MDs. Mentora handles briefing, contracts, travel and coordination on the day.</p>
      <div className="grid" style={{ margin: "22px 0", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
        <div className="dark-card"><div className="eyebrow">Icon tier</div><h3 style={{ fontFamily: "var(--sans)", fontSize: 17 }}>National &amp; global icons</h3><p className="small" style={{ margin: 0 }}>Laureates, national leaders and internationally recognized thinkers, listed only with their consent.</p></div>
        <div className="card"><div className="eyebrow">Executive tier</div><h3>CEOs, MDs &amp; board leaders</h3><p className="small muted" style={{ margin: 0 }}>Leaders of banks, telcos, FMCG and tech companies.</p></div>
        <div className="card"><div className="eyebrow">Expert tier</div><h3>Industry experts &amp; authors</h3><p className="small muted" style={{ margin: 0 }}>Specialists in AI, leadership, sales and wellbeing.</p></div>
      </div>
      <div className="chips" style={{ marginBottom: 18 }}>
        {TIERS.map(([v, l]) => (
          <Link key={v} className={`chip${tier === v ? " on" : ""}`} href={v ? `/speakers?tier=${v}` : "/speakers"}>{l}</Link>
        ))}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((s) => (
            <article className="card" key={s.id}>
              <div className="who">
                <Avatar name={s.name} seed={s.id} />
                <div style={{ minWidth: 0 }}>
                  <h3><Link href={`/speakers/${s.slug}`}>{s.name}</Link></h3>
                  <small>{s.title}</small>
                </div>
              </div>
              <div className="tags">
                <span className="tag gold">{TIER_LABEL[s.tier]} tier</span>
                {s.isSample ? <span className="tag sample">Sample</span> : null}
              </div>
              <div className="tags">{s.topics.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              <div className="meta"><span>Keynote · panel · fireside</span><b>{s.feeFromMinor ? <>From <Taka minor={s.feeFromMinor} /></> : "On request"}</b></div>
              <div className="btns"><Link className="btn btn-primary btn-sm" href={`/speakers/${s.slug}`}>Check availability</Link></div>
            </article>
          ))}
        </div>
      ) : (
        <Empty>No speakers listed in this tier yet.</Empty>
      )}
    </>
  );
}
