// Target CNAME value for tenant custom domains.
// Change here to update across the app.
export const CNAME_TARGET = "qr-genesis.lovable.app";

/**
 * Canonical SaaS host(s) — used to determine whether an incoming request
 * is hitting the default app domain or a tenant's custom domain.
 *
 * Keep all entries lowercase, without port or protocol.
 */
export const SAAS_HOSTS: readonly string[] = [
  "qr-genesis.lovable.app",
  "localhost",
  "127.0.0.1",
];

export function isSaasHost(host: string): boolean {
  return SAAS_HOSTS.includes(host.toLowerCase());
}
