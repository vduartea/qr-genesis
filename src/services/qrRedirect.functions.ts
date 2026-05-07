import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isValidQrId } from "@/lib/qrUrl";
import { findActiveRuleUrl, parseTimeRules } from "@/lib/timeRules";

type ResolveQrRedirectResult =
  | { status: "ok"; destinationUrl: string }
  | { status: "expired"; fallbackUrl: string | null }
  | { status: "invalid" };

/**
 * Public Supabase client for the redirect endpoint.
 *
 * We intentionally use the publishable (anon) key here rather than the
 * service role:
 *   - The Worker runtime exposes SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY,
 *     but not SUPABASE_SERVICE_ROLE_KEY.
 *   - RLS already allows anon to SELECT active qr_codes and to EXECUTE
 *     `increment_qr_scan` (SECURITY DEFINER), which is exactly what this
 *     public redirect needs.
 */
function getPublicSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const resolveQrRedirect = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { id: string; tenantId?: string | null; host?: string | null }) =>
      input,
  )
  .handler(async ({ data }): Promise<ResolveQrRedirectResult> => {
    if (!isValidQrId(data.id)) {
      return { status: "invalid" };
    }

    const supabase = getPublicSupabase();

    let query = supabase
      .from("qr_codes")
      .select(
        "id, destination_url, is_active, expires_at, fallback_url, time_rules, tenant_id",
      )
      .eq("id", data.id);

    // Stage 8: when the request comes from a custom domain, restrict the
    // lookup to that tenant. This prevents a custom domain from resolving
    // QRs that belong to another tenant.
    if (data.tenantId) {
      query = query.eq("tenant_id", data.tenantId);
    }

    const { data: qr, error } = await query.maybeSingle();

    if (error) {
      console.error("[qr-redirect] lookup failed", error);
      return { status: "invalid" };
    }

    if (!qr || !qr.is_active) {
      return { status: "invalid" };
    }

    // Expiration check — if expires_at is in the past, do NOT increment
    // scan_count and do NOT redirect to destination_url. Surface the
    // fallback URL (if any) so the route can render the expired screen.
    if (qr.expires_at && new Date(qr.expires_at).getTime() <= Date.now()) {
      return { status: "expired", fallbackUrl: qr.fallback_url ?? null };
    }

    // Time-based routing — evaluated after expiration. If the current
    // server time matches an active rule, override destination_url with
    // that rule's URL. Otherwise fall through to the base destination.
    const rules = parseTimeRules(qr.time_rules);
    const activeUrl = findActiveRuleUrl(rules);
    const finalDestination = activeUrl ?? qr.destination_url;

    // Stage 8: record_qr_scan inserts a row in qr_scans (qr_code_id,
    // tenant_id, host, scanned_at) and increments scan_count atomically.
    // Falls back to the legacy increment if the new RPC isn't available.
    const { error: rpcError } = await supabase.rpc("record_qr_scan", {
      _qr_id: qr.id,
      _host: data.host ?? null,
    });

    if (rpcError) {
      console.error("[qr-redirect] record_qr_scan failed", rpcError);
    }

    return { status: "ok", destinationUrl: finalDestination };
  });

export function throwExternalQrRedirect(destinationUrl: string): never {
  throw redirect({ href: destinationUrl });
}