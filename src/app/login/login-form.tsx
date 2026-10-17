"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    setBusy(false);
    if (!res || res.error) {
      setError("Email or password is incorrect.");
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} noValidate={false}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? <div className="flash error" role="alert">{error}</div> : null}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
