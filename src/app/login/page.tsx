import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-site paths; NextAuth's callbackUrl arrives as a full URL. */
function safeNext(raw: string | undefined): string {
  if (!raw) return "/dashboard";
  let path = raw;
  try {
    const u = new URL(raw, "http://local");
    path = u.pathname + u.search + u.hash;
  } catch {
    return "/dashboard";
  }
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login") ? path : "/dashboard";
}

export default function LoginPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const next = safeNext(searchParams.next ?? searchParams.callbackUrl);
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Sign in</h2>
      <Flash ok={searchParams.ok} error={searchParams.error ? "Email or password is incorrect." : undefined} />
      <div className="panel">
        <LoginForm next={next} />
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        <Link className="lnk" href="/forgot-password">Forgot your password?</Link> · New to Mentora? <Link className="lnk" href="/signup">Create an account</Link>
      </p>
    </div>
  );
}
