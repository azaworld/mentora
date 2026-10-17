import Link from "next/link";
import { ExpertCard, WorkshopRow } from "@/components/cards";
import { listExperts, listWorkshops } from "@/lib/queries";

const ROLE_CHIPS = [
  ["TRAINER", "Trainers"],
  ["FACILITATOR", "Facilitators"],
  ["COACH", "Coaches"],
  ["CONSULTANT", "Consultants"],
] as const;

const PILLARS = [
  ["/experts", "Marketplace", "Trainers & facilitators", "Vetted experts for in-house programs, matched to your brief."],
  ["/experts?role=COACH", "Marketplace", "Coaches & consultants", "One-to-one coaching and advisory for leaders."],
  ["/speakers", "Speakers bureau", "Keynote speakers", "Icons, CEOs and MDs for conferences and leadership events."],
  ["/workshops", "Workshops", "Paid workshops", "Online and onsite sessions with instant registration."],
  ["/ai-for-leaders", "Flagship", "AI for Leaders", "Turn AI into a 90-day plan for your leadership team."],
  ["/verify", "Certification", "Verify certificates", "Unique IDs and QR codes employers can check in seconds."],
] as const;

export default async function Home() {
  const [featured, upcoming] = await Promise.all([listExperts({}, 4), listWorkshops()]);
  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">Learning &amp; development marketplace</div>
          <h1>Find the right trainer, coach, consultant or speaker — for any team, in any format.</h1>
          <p className="lead">
            Book vetted experts, invite keynote speakers, join paid workshops online or onsite, and verify every certificate — in one place.
          </p>
          <form className="search" action="/experts" role="search">
            <input name="q" type="search" placeholder="Try “leadership”, “AI”, “sales coaching”…" aria-label="Search experts" />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          <div className="chips">
            {ROLE_CHIPS.map(([v, l]) => (
              <Link key={v} className="chip" href={`/experts?role=${v}`}>
                {l}
              </Link>
            ))}
            <Link className="chip" href="/speakers">
              Speakers
            </Link>
          </div>
        </div>
        <div className="dark-card">
          <h3>How it works for organizations</h3>
          <div className="row"><span>1. Post your training need</span><b>2 min</b></div>
          <div className="row"><span>2. Matched experts send proposals</span><b>48 hrs</b></div>
          <div className="row"><span>3. Accept and pay one invoice</span><b>bKash · card</b></div>
          <div className="row"><span>4. Outcome report &amp; verified certificates</span><b>QR verified</b></div>
          <Link className="btn btn-gold btn-block" style={{ marginTop: 12 }} href="/signup?type=org">
            Post a training need
          </Link>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 36, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {PILLARS.map(([href, k, t, d]) => (
          <Link key={t} href={href} className="card" style={{ textDecoration: "none" }}>
            <div className="eyebrow" style={{ color: "var(--teal)", fontSize: 11 }}>{k}</div>
            <h3 style={{ margin: "0 0 4px" }}>{t}</h3>
            <p className="small muted" style={{ margin: 0 }}>{d}</p>
          </Link>
        ))}
      </div>

      {featured.length ? (
        <div className="sec">
          <div className="sec-head">
            <h2>Featured experts</h2>
            <Link className="lnk" href="/experts">See all experts →</Link>
          </div>
          <div className="grid">
            {featured.map((r) => (
              <ExpertCard key={r.expert.id} expert={r.expert} featured={r.featured} minPrice={r.minPrice} />
            ))}
          </div>
        </div>
      ) : null}

      {upcoming.length ? (
        <div className="sec">
          <div className="sec-head">
            <h2>Upcoming workshops</h2>
            <Link className="lnk" href="/workshops">All workshops →</Link>
          </div>
          {upcoming.slice(0, 3).map((r) => (
            <WorkshopRow key={r.workshop.id} workshop={r.workshop} expert={r.expert} />
          ))}
        </div>
      ) : null}

      <div className="sec panel" style={{ background: "var(--soft)", border: 0, padding: 26 }}>
        <div className="g2" style={{ alignItems: "center" }}>
          <div>
            <div className="eyebrow">For experts</div>
            <h2>Grow your practice</h2>
            <p className="muted" style={{ margin: 0 }}>Get discovered, receive proposal requests, sell workshops and issue verified certificates. Start free.</p>
          </div>
          <div className="btns" style={{ justifyContent: "flex-end" }}>
            <Link className="btn btn-primary" href="/pricing">See expert plans</Link>
            <Link className="btn btn-ghost" href="/signup?type=expert">Apply free</Link>
          </div>
        </div>
      </div>
    </>
  );
}
