const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidQrId(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/**
 * Builds the public dynamic redirect URL for a saved QR.
 * Returns null instead of inventing placeholder paths when the id is invalid.
 */
export function getQrRedirectUrl(
  id: string | null | undefined,
  origin?: string,
): string | null {
  if (!isValidQrId(id)) return null;

  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/r/${id}`;
}

export function buildRedirectUrl(id: string, origin?: string): string {
  const redirectUrl = getQrRedirectUrl(id, origin);

  if (!redirectUrl) {
    throw new Error("No se puede construir un QR dinámico sin un id válido.");
  }

  return redirectUrl;
}

/**
 * Tenant-shaped data needed to compute the public QR URL.
 * Accepts a partial Tenant so callers can pass null/undefined safely.
 */
export interface TenantDomainInfo {
  custom_domain: string | null;
  custom_domain_status: string | null;
}

/**
 * Returns true when the tenant has a verified custom domain that should
 * be used as the host for new QR public URLs.
 */
export function tenantHasVerifiedDomain(
  tenant: TenantDomainInfo | null | undefined,
): boolean {
  return (
    !!tenant &&
    !!tenant.custom_domain &&
    tenant.custom_domain_status === "verified"
  );
}

/**
 * Centralized helper that builds the public URL encoded inside a QR.
 *
 *  - If the QR row already has a stored `public_qr_url`, return it as-is
 *    (preserves the URL for existing QRs created before this change).
 *  - Otherwise, if the tenant has a verified custom domain, use
 *    `https://{custom_domain}/q/{id}`.
 *  - Otherwise fall back to the default SaaS dynamic redirect URL
 *    (`{origin}/r/{id}`).
 */
export function buildQrPublicUrl(
  qr: { id: string; public_qr_url?: string | null },
  tenant: TenantDomainInfo | null | undefined,
  origin?: string,
): string | null {
  if (qr.public_qr_url && qr.public_qr_url.trim() !== "") {
    return qr.public_qr_url;
  }
  if (!isValidQrId(qr.id)) return null;
  if (tenantHasVerifiedDomain(tenant)) {
    return `https://${tenant!.custom_domain}/q/${qr.id}`;
  }
  return getQrRedirectUrl(qr.id, origin);
}

/**
 * Preview-only variant: builds the URL that *would* be encoded for a new
 * QR with the given id. Useful in the creation screen before the row exists
 * in the database.
 */
export function previewQrPublicUrl(
  id: string,
  tenant: TenantDomainInfo | null | undefined,
  origin?: string,
): string | null {
  return buildQrPublicUrl({ id, public_qr_url: null }, tenant, origin);
}