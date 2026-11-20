import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/marca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/painel", "/entrar", "/api"] }],
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
