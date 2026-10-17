import Link from "next/link";
import { resetPassword } from "@/app/actions/account";
import { Field, Flash } from "@/components/ui";
import { PASSWORD_MIN } from "@/lib/auth";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPassword({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const token = searchParams.token ?? "";
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Choose a new password</h2>
      <Flash error={searchParams.error} />
      {token ? (
        <form className="panel" action={resetPassword}>
          <input type="hidden" name="token" value={token} />
          <Field label="New password" name="password" hint={`At least ${PASSWORD_MIN} characters`}>
            <input id="password" name="password" type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" name="confirm"><input id="confirm" name="confirm" type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" /></Field>
          <button className="btn btn-primary btn-block" type="submit">Update password</button>
        </form>
      ) : (
        <p>This link is missing its token. <Link className="lnk" href="/forgot-password">Request a new link</Link>.</p>
      )}
    </div>
  );
}
