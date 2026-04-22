import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidQrId } from "@/lib/qrUrl";

type ResolveQrRedirectResult =
  | { status: "ok"; destinationUrl: string }
  | { status: "invalid" };

export const resolveQrRedirect = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ResolveQrRedirectResult> => {
    if (!isValidQrId(data.id)) {
      return { status: "invalid" };
    }

    const { data: qr, error } = await supabaseAdmin
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

    void supabaseAdmin
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