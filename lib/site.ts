/**
 * The public origin, used for absolute URLs in metadata, the sitemap and llms.txt.
 * NEXT_PUBLIC_SITE_URL wins (set it once a custom domain is live); otherwise Vercel's
 * production domain, then localhost for dev.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");
