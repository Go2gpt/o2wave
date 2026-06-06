import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Flujo PKCE (OAuth, magic link → ?code= → exchangeCodeForSession).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sin parámetros válidos o falló la verificación.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
