import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Allow callers to override the post-confirmation destination.
  const next = searchParams.get("next") ?? "/onboarding/web";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or exchange failed → send to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
