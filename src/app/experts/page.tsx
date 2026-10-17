import type { Metadata } from "next";
import Link from "next/link";
import { ExpertCard } from "@/components/cards";
import { Empty } from "@/components/ui";
import { listExperts, listTopics } from "@/lib/queries";

export const metadata: Metadata = { title: "Find experts" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ExpertsPage({ searchParams }: { searchParams: SP }) {
  const f = { role: one(searchParams.role), topic: one(searchParams.topic), format: one(searchParams.format), language: one(searchParams.language), q: one(searchParams.q) };
  const [rows, topics] = await Promise.all([listExperts(f), listTopics()]);
  return (
    <>
      <div className="eyebrow">Marketplace</div>
      <h2>Trainers, facilitators, coaches &amp; consultants</h2>
      <p className="lead">Every profile is reviewed before it goes live. Request a proposal, compare quotes, and pay through one secure invoice.</p>
      <div className="layout">
        <form className="panel" style={{ alignSelf: "start" }} aria-label="Filters">
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue={f.role}>
              <option value="">All roles</option>
              <option value="TRAINER">Trainer</option>
              <option value="FACILITATOR">Facilitator</option>
              <option value="COACH">Coach</option>
              <option value="CONSULTANT">Consultant</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="topic">Topic</label>
            <select id="topic" name="topic" defaultValue={f.topic}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="format">Format</label>
            <select id="format" name="format" defaultValue={f.format}>
              <option value="">Online or onsite</option>
              <option value="ONLINE">Online</option>
              <option value="ONSITE">Onsite</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="language">Language</label>
            <select id="language" name="language" defaultValue={f.language}>
              <option value="">Any</option>
              <option value="Bangla">Bangla</option>
              <option value="English">English</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="q">Keyword</label>
            <input id="q" name="q" defaultValue={f.q} placeholder="Name or skill" />
          </div>
          <button className="btn btn-primary btn-block" type="submit">Apply filters</button>
          <Link className="btn btn-ghost btn-block" style={{ marginTop: 8 }} href="/experts">Clear</Link>
        </form>
        <div>
          <div className="small muted" style={{ marginBottom: 12 }}>
            {rows.length} expert{rows.length === 1 ? "" : "s"} · featured experts first
          </div>
          {rows.length ? (
            <div className="grid">
              {rows.map((r) => (
                <ExpertCard key={r.expert.id} expert={r.expert} featured={r.featured} minPrice={r.minPrice} />
              ))}
            </div>
          ) : (
            <Empty>
              No experts match these filters. <Link className="lnk" href="/experts">Clear filters</Link>
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}
