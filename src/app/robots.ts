import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/payments";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/orders/", "/pay/", "/reset-password"] },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
