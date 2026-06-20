import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Tras confirmar la sesión, copia el NIF de los metadatos del usuario a
 * profiles.nif si aún está vacío. El trigger handle_new_user ya debería hacerlo,
 * pero esto cubre el flujo de confirmación por email de forma robusta. Tolerante:
 * nunca rompe el callback.
 */
async function persistirNifSiFalta(supabase: SupabaseClient) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const nifMeta = (user.user_metadata?.nif as string | undefined)?.trim();
    if (nifMeta) {
      const { data: profile } = await supabase.from("profiles").select("nif").eq("id", user.id).single();
      if (profile && !profile.nif) {
        await supabase.from("profiles").update({ nif: nifMeta }).eq("id", user.id);
      }
    }
    // tipo_documento: best-effort (la columna puede no existir aún → el catch lo absorbe).
    const tipoDocMeta = (user.user_metadata?.tipo_documento as string | undefined)?.trim();
    if (tipoDocMeta) {
      await supabase.from("profiles").update({ tipo_documento: tipoDocMeta }).eq("id", user.id).then(() => {}, () => {});
    }
  } catch { /* noop: el NIF no es crítico para completar el login */ }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Destino tras confirmar (lo puede sobreescribir ?next=).
  const next = searchParams.get("next") ?? "/onboarding/web";

  const supabase = createClient();

  // Flujo de confirmación por email / OTP (token_hash + type → verifyOtp).
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await persistirNifSiFalta(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Flujo PKCE (OAuth, magic link → ?code= → exchangeCodeForSession).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await persistirNifSiFalta(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sin parámetros válidos o falló la verificación.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
