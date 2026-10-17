import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { certificates, experts } from "@/db/schema";
import { fmtDate } from "@/components/ui";
import { normalizeCertificateCode } from "@/lib/codes";

export const metadata: Metadata = { title: "Verify a certificate" };

export default async function VerifyPage({ searchParams }: { searchParams: { code?: string } }) {
  const raw = searchParams.code ?? "";
  const code = raw ? normalizeCertificateCode(raw) : null;
  let result: { cert: typeof certificates.$inferSelect; issuer: string | null } | null = null;
  if (code) {
    const [row] = await getDb()
      .select({ cert: certificates, issuer: experts.name })
      .from(certificates)
      .leftJoin(experts, eq(certificates.issuedById, experts.id))
      .where(eq(certificates.code, code));
    result = row ?? null;
  }
  return (
    <div className="split">
      <div>
        <div className="eyebrow">Certification portal</div>
        <h2>Verify a Mentora certificate</h2>
        <p className="lead">Every certificate carries a unique code and QR. Enter the code printed under the QR to confirm it.</p>
        <form className="panel" action="/verify" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 0, fontFamily: "ui-monospace, Menlo, monospace" }} name="code" defaultValue={raw} placeholder="MN-2026-XXXXXXXX" aria-label="Certificate code" required />
          <button className="btn btn-primary" type="submit">Verify</button>
        </form>
        {raw && !code ? <div className="flash error" style={{ marginTop: 12 }}>That doesn’t look like a Mentora certificate code. Codes look like MN-2026-7K3QX9PD.</div> : null}
        {code && !result ? <div className="flash error" style={{ marginTop: 12 }}>No certificate found with code {code}. Check the code and try again.</div> : null}
        {result ? (
          result.cert.revokedAt ? (
            <div className="flash error" style={{ marginTop: 12 }}>Certificate {result.cert.code} was revoked on {fmtDate(result.cert.revokedAt)}.</div>
          ) : (
            <div className="panel" style={{ marginTop: 12, borderColor: "var(--ok)", background: "var(--ok-soft)" }}>
              <h3 style={{ color: "var(--ok)" }}>Valid certificate</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "4px 12px", margin: 0, fontSize: 14 }}>
                <dt className="muted">Holder</dt><dd style={{ margin: 0 }}>{result.cert.holderName}</dd>
                <dt className="muted">Program</dt><dd style={{ margin: 0 }}>{result.cert.program}</dd>
                <dt className="muted">Issued</dt><dd style={{ margin: 0 }}>{fmtDate(result.cert.issuedAt)}</dd>
                {result.cert.orgName ? <><dt className="muted">Organization</dt><dd style={{ margin: 0 }}>{result.cert.orgName}</dd></> : null}
                {result.issuer ? <><dt className="muted">Issued by</dt><dd style={{ margin: 0 }}>{result.issuer} via Mentora</dd></> : null}
                <dt className="muted">Code</dt><dd style={{ margin: 0 }} className="code">{result.cert.code}</dd>
              </dl>
            </div>
          )
        ) : null}
      </div>
      <div className="cert">
        <div className="eyebrow" style={{ letterSpacing: "0.2em" }}>Certificate of completion</div>
        {result && !result.cert.revokedAt ? (
          <>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 26, margin: "10px 0 4px" }}>{result.cert.holderName}</h3>
            <div className="small muted">has successfully completed</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 6 }}>{result.cert.program}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/certificates/${result.cert.code}/qr`} alt={`QR code for certificate ${result.cert.code}`} width={120} height={120} style={{ margin: "14px auto 6px", display: "block", background: "#fff", borderRadius: 6 }} />
            <div className="code">{result.cert.code}</div>
          </>
        ) : (
          <p className="muted" style={{ margin: "20px 0" }}>Enter a code to see the certificate here.</p>
        )}
      </div>
    </div>
  );
}
