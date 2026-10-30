/**
 * Canonical Site URL Configuration
 * Single source of truth for base domain resolution across metadata,
 * sitemaps, robots.txt, structured data (JSON-LD), and email templates.
 */

export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://gourabmondal.vercel.app"
).replace(/\/+$/, "");

/**
 * Returns a normalized canonical absolute URL for a given relative or root path.
 */
export function getCanonicalUrl(path: string = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
}
