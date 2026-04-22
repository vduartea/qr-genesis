import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resolveAndTrackQr(id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("qr_codes")
    .select("id, destination_url, is_active, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("[qr redirect] not found", error);
    return null;
  }

  if (data.is_active === false) return null;

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  const { error: rpcError } = await supabaseAdmin.rpc(
    "increment_qr_scan",
    { _qr_id: data.id }
  );

  if (rpcError) {
    console.error("[scan tracking error]", rpcError);
  }

  return data.destination_url;
}
