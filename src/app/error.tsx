"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p className="muted">Please try again. If it keeps happening, contact us and quote this reference{error.digest ? `: ${error.digest}` : "."}</p>
      <div className="btns" style={{ justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={reset} type="button">Try again</button>
        <Link className="btn btn-ghost" href="/">Back to Mentora</Link>
      </div>
    </div>
  );
}
