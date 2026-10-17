import type { MetadataRoute } from "next";
import { listExperts, listSpeakers, listWorkshops } from "@/lib/queries";
import { appUrl } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const fixed = ["", "/experts", "/speakers", "/workshops", "/ai-for-leaders", "/verify", "/pricing", "/terms", "/privacy", "/refunds"].map((p) => ({ url: `${base}${p}` }));
  try {
    const [experts, speakers, workshops] = await Promise.all([listExperts({}, 1000), listSpeakers(), listWorkshops()]);
    return [
      ...fixed,
      ...experts.map((r) => ({ url: `${base}/experts/${r.expert.slug}` })),
      ...speakers.map((s) => ({ url: `${base}/speakers/${s.slug}` })),
      ...workshops.map((w) => ({ url: `${base}/workshops/${w.workshop.id}` })),
    ];
  } catch {
    return fixed;
  }
}
