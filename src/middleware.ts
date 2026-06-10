import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/auth", "/onboarding", "/privacidad", "/terminos", "/cookies", "/plans"];
const AUTH_ROUTES = ["/login", "/register", "/welcome"];
const LEGAL_ROUTES = ["/privacidad", "/terminos", "/cookies"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Cookie de sesión: quitamos maxAge/expires (la librería fuerza 400
          // días por defecto en cada set; ignorar cookieOptions no basta).
          const { maxAge: _m, expires: _e, ...rest } = options;
          request.cookies.set({ name, value, ...rest });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...rest });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = request.nextUrl.pathname;

  // Construye un redirect copiando las cookies escritas en `response` (p. ej.
  // el token refrescado por getSession). Sin esto, el redirect perdería el
  // refresh y podría expulsar a un usuario válido.
  const redirectTo = (dest: string) => {
    const r = NextResponse.redirect(new URL(dest, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // Redirect root to welcome
  if (pathname === "/") {
    return redirectTo("/welcome");
  }

  // Authenticated users shouldn't access auth pages. Si traen un ?redirect=
  // interno (p. ej. desde el email de aviso al admin), lo respetamos.
  if (session && AUTH_ROUTES.includes(pathname)) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const dest = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";
    return redirectTo(dest);
  }

  // Force onboarding completion for authenticated users.
  // Skip /onboarding and /auth (the flow itself) and /api (so the
  // onboarding page's fetch to /api/analyze-web is not redirected).
  if (
    session &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api") &&
    !LEGAL_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_complete, tipo_entidad, estado_verificacion")
      .eq("id", session.user.id)
      .single();

    // Defensa: solo aplicamos los gates si la lectura del perfil fue exitosa
    // y devolvió datos. Si la consulta falla (p. ej. carrera de cookies justo
    // tras el login), NO expulsamos al usuario; en la siguiente navegación,
    // con las cookies ya consolidadas, el gate vuelve a evaluarse.
    if (!profileError && profile) {
      if (!profile.onboarding_complete) {
        return redirectTo("/onboarding/web");
      }

      // Gate de verificación documental para ONGs
      const requiereVerificacion =
        profile.tipo_entidad === "ong_pequena" ||
        profile.tipo_entidad === "ong_mediana";

      if (
        requiereVerificacion &&
        profile.estado_verificacion !== "verificada" &&
        !pathname.startsWith("/verificacion")
      ) {
        return redirectTo("/verificacion");
      }
    }
  }

  // Unauthenticated users can't access protected routes
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isApi = pathname.startsWith("/api");
  if (!session && !isPublic && !isApi) {
    return redirectTo("/welcome");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
