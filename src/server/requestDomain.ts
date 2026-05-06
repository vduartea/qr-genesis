import { isSaasHost } from "@/lib/domainConfig";

/**
 * Extracts and normalizes the incoming Host header from a server Request.
 *
 * - lowercases
 * - trims whitespace
 * - strips port (e.g. "localhost:3000" → "localhost")
 * - falls back to X-Forwarded-Host when present (proxied envs)
 *
 * Returns null when no host header is available.
 */
export function getRequestHost(request: Request): string | null {
  if (!request || !request.headers) return null;
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const cleaned = raw.trim().toLowerCase().split(",")[0]?.trim() ?? "";
  if (!cleaned) return null;
  // Strip port
  const noPort = cleaned.replace(/:\d+$/, "");
  return noPort || null;
}

export interface DomainContext {
  host: string | null;
  isCustomDomain: boolean;
}

/**
 * Returns a normalized view of the request's domain origin.
 * `isCustomDomain` is true when the host is NOT one of the configured
 * SaaS hosts. Future stages will use this to map domain → tenant.
 */
export function getDomainContext(request: Request): DomainContext {
  const host = getRequestHost(request);
  if (!host) return { host: null, isCustomDomain: false };
  return { host, isCustomDomain: !isSaasHost(host) };
}