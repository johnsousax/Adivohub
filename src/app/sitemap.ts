import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/marca";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: URL_SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITE}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL_SITE}/termos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
