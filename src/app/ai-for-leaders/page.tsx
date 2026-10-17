import type { Metadata } from "next";
import Link from "next/link";
import { requestProgram } from "@/app/actions/public";
import { Field, Flash, Taka } from "@/components/ui";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "AI for Leaders" };

const MODULES = [
  ["AI in plain language", "What today's AI can and cannot do, without the hype."],
  ["Finding the value", "Mapping your team's work to high-return AI use cases."],
  ["Risk, data & policy", "Data privacy, accuracy, and a simple AI usage policy."],
  ["Hands-on with AI tools", "Leaders use AI on their own reports, emails and analysis."],
  ["Your 90-day AI plan", "Owners, pilots and metrics, ready to present to your board."],
] as const;

export default async function AiForLeaders({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const rates = await getSettings(getDb());
  return (
    <div className="split">
      <div>
        <Flash ok={searchParams.ok} error={searchParams.error} />
        <div className="eyebrow">Flagship program</div>
        <h1>AI for Leaders</h1>
        <p className="lead">A practical program for CXOs, heads of department and managers: where AI creates real value, the risks, and how to start — with a 90-day AI plan for your team by the end.</p>
        <div className="pkgs">
          <div className="pkg"><b>Executive briefing</b><span className="small muted">2 hours · board or leadership team</span><div className="amt"><Taka minor={rates.aiBriefingPriceMinor} /></div><span className="small muted">per program</span></div>
          <div className="pkg"><b>One-day intensive</b><span className="small muted">In-house · up to 30 leaders</span><div className="amt"><Taka minor={rates.aiOneDayPriceMinor} /></div><span className="small muted">per program</span></div>
          <div className="pkg"><b>Leadership cohort</b><span className="small muted">4 weeks · open enrolment</span><div className="amt">Per seat</div><Link className="lnk small" href="/workshops">See open cohorts →</Link></div>
        </div>
        <h3>What leaders work through</h3>
        <ol className="list" style={{ listStyle: "none" }}>
          {MODULES.map(([t, d]) => (
            <li key={t}><b>{t}</b><div className="small muted">{d}</div></li>
          ))}
        </ol>
        <div className="note">Every participant receives the <b>Certified AI-Ready Leader</b> certificate, verifiable on Mentora.</div>
      </div>
      <aside className="panel sticky">
        <div className="eyebrow">Request an in-house program</div>
        <form action={requestProgram}>
          <Field label="Organization" name="orgName"><input id="orgName" name="orgName" required minLength={2} /></Field>
          <Field label="Work email" name="email"><input id="email" name="email" type="email" required /></Field>
          <Field label="Package" name="package">
            <select id="package" name="package"><option value="EXECUTIVE_BRIEFING">Executive briefing</option><option value="ONE_DAY_INTENSIVE">One-day intensive</option></select>
          </Field>
          <Field label="Number of leaders" name="leaders"><input id="leaders" name="leaders" type="number" min={3} defaultValue={20} required /></Field>
          <button className="btn btn-primary btn-block" type="submit">Send request</button>
        </form>
        <p className="small muted" style={{ margin: "12px 0 0" }}>Lead facilitator: <Link className="lnk" href="/experts/arifuzzaman-antor">Arifuzzaman Antor</Link>, Founder &amp; CEO of AZAI Labs.</p>
      </aside>
    </div>
  );
}
