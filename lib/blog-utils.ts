/**
 * Client-safe pure date and string utilities for blog components.
 */

/**
 * Safely converts Date | string | null to an ISO-8601 string.
 */
export function toIsoDateString(date?: Date | string | null): string {
  if (!date) return "";
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

/**
 * Safely formats Date | string | null to human-readable format.
 */
export function formatBlogDate(
  date?: Date | string | null,
  format: "short" | "long" = "short"
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: format === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}
