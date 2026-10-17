import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/account";
import { Field, Flash } from "@/components/ui";

export const metadata = { title: "Reset your password" };

export default function ForgotPassword({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Reset your password</h2>
      <p className="muted">Enter your account email and we’ll send you a link to choose a new password.</p>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <form className="panel" action={requestPasswordReset}>
        <Field label="Email" name="email"><input id="email" name="email" type="email" required autoComplete="email" /></Field>
        <button className="btn btn-primary btn-block" type="submit">Send reset link</button>
      </form>
      <p className="small muted" style={{ marginTop: 14 }}><Link className="lnk" href="/login">Back to sign in</Link></p>
    </div>
  );
}
