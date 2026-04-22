import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resolveAndTrackQr(id: string): Promise<string | null> {
  console.log("[qr] resolving id:", id);
  const { data, error } = await supabaseAdmin
    .from("qr_codes")
    .select("id, destination_url, is_active, expires_at")
    .eq("id", id)
    .maybeSingle();
   console.log("[qr] select result:", { data, error });
  if (error || !data) {
    console.error("[qr redirect] not found", error);
    return null;
  }

  if (data.is_active === false) return null;
console.warn("[qr] inactive qr");
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    console.warn("[qr] expired qr");
    return null;
  }

  const { error: rpcError } = await supabaseAdmin.rpc(
    "increment_qr_scan",
    { _qr_id: data.id }
  );
console.log("[qr] rpc result:", { rpcError });
  if (rpcError) {
    console.error("[scan tracking error]", rpcError);
  }
console.log("[qr] redirecting to:", data.destination_url);
  return data.destination_url;
}
