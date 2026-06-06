import { createBrowserClient } from "@supabase/ssr";

/**
 * Serializa una cookie como cookie de SESIÓN: respeta path/sameSite/secure/
 * domain pero elimina maxAge/expires en los "set" reales (así muere al cerrar
 * el navegador). En los borrados (value vacío o maxAge 0) conserva maxAge para
 * que signOut siga limpiando las cookies.
 */
function serializeSessionCookie(name: string, value: string, options: Record<string, unknown> = {}): string {
  const isRemoval = !value || options.maxAge === 0;
  let str = `${name}=${encodeURIComponent(value)}`;
  str += `; path=${(options.path as string) ?? "/"}`;
  if (isRemoval && options.maxAge != null) str += `; max-age=${options.maxAge}`;
  if (options.domain) str += `; domain=${options.domain}`;
  if (options.sameSite) str += `; samesite=${String(options.sameSite).toLowerCase()}`;
  if (options.secure) str += `; secure`;
  return str;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .map((c) => {
              const i = c.indexOf("=");
              return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
            });
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") return;
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serializeSessionCookie(name, value, (options ?? {}) as Record<string, unknown>);
          });
        },
      },
    }
  );
}
