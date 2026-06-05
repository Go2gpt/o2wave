import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/auth", "/onboarding"];
const AUTH_ROUTES = ["/login", "/register", "/welcome"];

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
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
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

  // Redirect root to welcome
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  // Authenticated users shouldn't access auth pages
  if (session && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Force onboarding completion for authenticated users.
  // Skip /onboarding and /auth (the flow itself) and /api (so the
  // onboarding page's fetch to /api/analyze-web is not redirected).
  if (
    session &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, tipo_entidad, estado_verificacion")
      .eq("id", session.user.id)
      .single();

    if (!profile?.onboarding_complete) {
      return NextResponse.redirect(new URL("/onboarding/web", request.url));
    }

    // Gate de verificación documental para ONGs
    const requiereVerificacion =
      profile?.tipo_entidad === "ong_pequena" ||
      profile?.tipo_entidad === "ong_mediana";

    if (
      requiereVerificacion &&
      profile?.estado_verificacion !== "verificada" &&
      !pathname.startsWith("/verificacion")
    ) {
      return NextResponse.redirect(new URL("/verificacion", request.url));
    }
  }

  // Unauthenticated users can't access protected routes
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isApi = pathname.startsWith("/api");
  if (!session && !isPublic && !isApi) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
