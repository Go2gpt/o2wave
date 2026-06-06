"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const KEY = "o2wave-cookie-notice-seen";
// Rutas públicas (sin NavBottom). El resto se consideran protegidas.
const PUBLIC_PREFIXES = ["/welcome", "/login", "/register", "/onboarding", "/verificacion", "/privacidad", "/terminos", "/cookies", "/auth"];

export default function CookieNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setVisible(true); } catch {}
  }, []);

  if (!visible) return null;

  // En rutas protegidas, dejar hueco sobre la NavBottom (~80px).
  const enProtegida = pathname !== "/" && !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const bottom = enProtegida ? "calc(env(safe-area-inset-bottom) + 88px)" : "calc(env(safe-area-inset-bottom) + 12px)";

  const aceptar = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed left-0 right-0 z-[55] px-4" style={{ bottom }}>
      <div className="mx-auto max-w-md sm:max-w-sm sm:ml-auto sm:mr-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🍪</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 leading-relaxed">
            o2Wave usa solo cookies técnicas necesarias para funcionar. Más info en nuestra{" "}
            <Link href="/cookies" className="font-semibold underline" style={{ color: "#93bf30" }}>Política de Cookies</Link>.
          </p>
          <button onClick={aceptar}
            className="mt-2.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: "#f9b23b" }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
