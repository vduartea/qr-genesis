import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isValidQrId } from "@/lib/qrUrl";

type ResolveQrRedirectResult =
  | { status: "ok"; destinationUrl: string }
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
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ResolveQrRedirectResult> => {
    if (!isValidQrId(data.id)) {
      return { status: "invalid" };
    }

    const supabase = getPublicSupabase();

    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select("id, destination_url, is_active")
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("[qr-redirect] lookup failed", error);
      return { status: "invalid" };
    }

    if (!qr || !qr.is_active) {
      return { status: "invalid" };
    }

    void supabase
      .rpc("increment_qr_scan", { _qr_id: qr.id })
      .then(({ error: rpcError }) => {
        if (rpcError) {
          console.error("[qr-redirect] scan increment failed", rpcError);
        }
      });

    return { status: "ok", destinationUrl: qr.destination_url };
  });

export async function getQrRedirectOrThrow(id: string) {
  const result = await resolveQrRedirect({ data: { id } });

  if (result.status !== "ok") {
    return null;
  }

  return result.destinationUrl;
}

export function throwExternalQrRedirect(destinationUrl: string): never {
  throw redirect({ href: destinationUrl });
}