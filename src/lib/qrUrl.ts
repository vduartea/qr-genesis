/**
 * Builds the public dynamic redirect URL for a saved QR.
 * The encoded QR points here; the server route resolves the destination.
 */
export function buildRedirectUrl(id: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/r/${id}`;
}