import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { normalizeCertificateCode } from "@/lib/codes";
import { appUrl } from "@/lib/payments";

/** QR code (SVG) that opens the public verification page for a certificate. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = normalizeCertificateCode(params.code);
  if (!code) return NextResponse.json({ error: "Invalid certificate code" }, { status: 400 });
  const svg = await QRCode.toString(`${appUrl()}/verify?code=${code}`, { type: "svg", margin: 1, width: 240 });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
