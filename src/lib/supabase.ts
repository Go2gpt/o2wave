import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Cookies de sesión (sin Max-Age): la sesión muere al cerrar el navegador.
    { cookieOptions: { maxAge: undefined } }
  );
}
