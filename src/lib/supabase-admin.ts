import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la service role key. Omite RLS — usar SOLO en
 * código de servidor (route handlers, server components de admin), nunca
 * en el cliente. Pensado para updates privilegiados y signed URLs.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
