/** Canonical public origin (custom domain). Used when env does not override. */
export const SITE_ORIGIN = "https://swedle.mokh.xyz";

/** Canonical site origin for metadata, sitemap, and robots. */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    try {
      const normalized = explicit.endsWith("/") ? explicit.slice(0, -1) : explicit;
      return new URL(normalized);
    } catch {
      /* fall through */
    }
  }

  // Vercel preview deployments: use the preview hostname, not the live domain.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV === "production") {
    return new URL(SITE_ORIGIN);
  }

  return new URL("http://localhost:3000");
}
