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