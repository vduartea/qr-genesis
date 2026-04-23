import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type QrCode = Tables<"qr_codes">;
export type QrCodeInsert = TablesInsert<"qr_codes">;
export type QrCodeUpdate = TablesUpdate<"qr_codes">;

export type CreateQrInput = {
  name: string;
  destination_url: string;
  type?: string;
  is_dynamic?: boolean;
  is_active?: boolean;
  expires_at?: string | null;
  fallback_url?: string | null;
};

/**
 * QR data access layer.
 * All operations rely on Supabase RLS (auth.uid() = user_id) to enforce
 * ownership — but we also pass user_id explicitly on insert.
 */

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("No hay un usuario autenticado.");
  return data.user.id;
}

export async function createQr(input: CreateQrInput): Promise<QrCode> {
  const userId = await getCurrentUserId();

  const payload: QrCodeInsert = {
    user_id: userId,
    name: input.name,
    destination_url: input.destination_url,
    type: input.type ?? "url",
    is_dynamic: input.is_dynamic ?? false,
    is_active: input.is_active ?? true,
    expires_at: input.expires_at ?? null,
    fallback_url: input.fallback_url ?? null,
  };

  const { data, error } = await supabase
    .from("qr_codes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listQrsByCurrentUser(): Promise<QrCode[]> {
  // RLS already restricts to current user; we just sort.
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getQrById(id: string): Promise<QrCode | null> {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateQr(id: string, patch: QrCodeUpdate): Promise<QrCode> {
  // Strip immutable fields if accidentally passed.
  const { id: _id, user_id: _u, created_at: _c, ...safePatch } = patch as QrCodeUpdate & {
    id?: string;
    user_id?: string;
    created_at?: string;
  };

  const { data, error } = await supabase
    .from("qr_codes")
    .update(safePatch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQr(id: string): Promise<void> {
  const { error } = await supabase.from("qr_codes").delete().eq("id", id);
  if (error) throw error;
}

export async function countQrsByCurrentUser(): Promise<number> {
  const { count, error } = await supabase
    .from("qr_codes")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
