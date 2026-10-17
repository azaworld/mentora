import type { Metadata } from "next";
import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { Field, Flash } from "@/components/ui";
import { PASSWORD_MIN } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const type = searchParams.type === "expert" ? "EXPERT" : "ORG";
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h2>Create your Mentora account</h2>
      <div className="chips" style={{ marginBottom: 16 }}>
        <Link className={`chip${type === "ORG" ? " on" : ""}`} href="/signup?type=org">I’m hiring for an organization</Link>
        <Link className={`chip${type === "EXPERT" ? " on" : ""}`} href="/signup?type=expert">I’m a trainer, coach or consultant</Link>
      </div>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <form className="panel" action={signupAction}>
        <input type="hidden" name="accountType" value={type} />
        <Field label="Your full name" name="name"><input id="name" name="name" required minLength={2} autoComplete="name" /></Field>
        <Field label="Email" name="email"><input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password" name="password" hint={`At least ${PASSWORD_MIN} characters`}>
          <input id="password" name="password" type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" />
        </Field>
        {type === "ORG" ? (
          <Field label="Organization name" name="orgName"><input id="orgName" name="orgName" required minLength={2} autoComplete="organization" /></Field>
        ) : (
          <>
            <div className="row2">
              <Field label="Role" name="role">
                <select id="role" name="role"><option value="TRAINER">Trainer</option><option value="FACILITATOR">Facilitator</option><option value="COACH">Coach</option><option value="CONSULTANT">Consultant</option></select>
              </Field>
              <Field label="Years of experience" name="yearsExperience"><input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={5} required /></Field>
            </div>
            <Field label="Headline" name="headline" hint="One line, e.g. “Leadership trainer for banking teams”"><input id="headline" name="headline" required minLength={5} maxLength={160} /></Field>
            <div className="row2">
              <Field label="City" name="city"><input id="city" name="city" defaultValue="Dhaka" required /></Field>
              <Field label="Main topics" name="topics" hint="Separate with commas"><input id="topics" name="topics" required placeholder="Leadership, Sales" /></Field>
            </div>
            <label className="check" htmlFor="consent">
              <input id="consent" name="consent" type="checkbox" required />
              <span>I agree that my profile, once approved by Mentora, is shown publicly.</span>
            </label>
          </>
        )}
        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} type="submit">Create account</button>
      </form>
      <p className="small muted" style={{ marginTop: 14 }}>Already have an account? <Link className="lnk" href="/login">Sign in</Link></p>
    </div>
  );
}
