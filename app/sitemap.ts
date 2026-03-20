import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const paths = ["", "/lang", "/stars", "/ipo", "/complexity", "/timeline"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().origin;
  const now = new Date();
  return paths.map((path) => ({
    url: path === "" ? base : `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.85,
  }));
}
