/**
 * Dynamic API Base URL resolver.
 *
 * Automatically routes requests to relative "/api/v1" whenever accessed over HTTPS
 * or via external hostnames (such as Cloudflare Tunnel), preventing mixed-content
 * and cross-origin blocking issues.
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    if (
      window.location.protocol === "https:" ||
      !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)
    ) {
      return "/api/v1";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
}

export const API_BASE = {
  toString(): string {
    return getApiBase();
  },
} as unknown as string;
