import { checkRateLimit as checkVercelRateLimit } from "@vercel/firewall";

export const VERCEL_FIREWALL_RULE_ID =
  process.env.VERCEL_FIREWALL_RULE_ID ||
  "rule_rate_limit_email_endpoints_l0RL18";

export interface FirewallRateLimitResult {
  success: boolean;
  error?: string;
}

/**
 * Rate Limiting via Vercel Firewall:
 * Relies on Vercel WAF rule `rule_rate_limit_email_endpoints_l0RL18` configured at the edge.
 * In production on Vercel, WAF blocks exceeding requests directly at the edge (5 req / 3600s).
 * Programmatic check provides defense-in-depth within the route handler.
 * In local development, gracefully returns { success: true }.
 */
export async function checkFirewallRateLimit(
  req: Request,
  ruleId: string = VERCEL_FIREWALL_RULE_ID
): Promise<FirewallRateLimitResult> {
  try {
    const { rateLimited } = await checkVercelRateLimit(ruleId, {
      request: req,
    });
    if (rateLimited) {
      return {
        success: false,
        error: "Too many requests from this IP. Please try again later.",
      };
    }
  } catch {
    // Non-fatal: if outside Vercel or misconfigured, don't crash
  }
  return { success: true };
}

/**
 * Hardened client IP extraction for logging and audit.
 * Reverse proxies (Vercel Edge, Cloudflare, Nginx) strip or overwrite `x-real-ip` with the actual client IP,
 * and append the real client IP to the END of `x-forwarded-for`.
 */
export function getClientIp(req: Request): string {
  // 1. Most trusted: x-real-ip is set by the edge reverse proxy and cannot be spoofed by clients
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 2. Vercel specific headers
  const vercelIp = req.headers.get("x-vercel-ip");
  if (vercelIp && vercelIp.trim()) {
    return vercelIp.trim();
  }

  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const parts = vercelForwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  // 3. Standard x-forwarded-for: the outermost reverse proxy appends the real IP to the end of the chain.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "127.0.0.1";
}
