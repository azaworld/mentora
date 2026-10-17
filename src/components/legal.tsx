import type { ReactNode } from "react";

/** Shared layout for policy pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="eyebrow">Policy</div>
      <h1 style={{ fontSize: "clamp(28px,4vw,38px)" }}>{title}</h1>
      <p className="small muted">Last updated {updated}</p>
      <div className="note gold small">This is a starting draft. Have a lawyer in Bangladesh review it before launch.</div>
      <div className="legal">{children}</div>
    </article>
  );
}
