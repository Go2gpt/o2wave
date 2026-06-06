"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const IDLE_MS = 15 * 60 * 1000; // 15 minutos
const THROTTLE_MS = 5000;       // como mucho re-armamos el timer cada 5s

/**
 * Cierra la sesión tras 15 min sin actividad del usuario y redirige a
 * /login?reason=inactivity. Se monta solo en rutas autenticadas.
 */
export default function IdleLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReset = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    const logout = async () => {
      try { await supabase.auth.signOut(); } catch {}
      router.replace("/login?reason=inactivity");
    };

    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset.current < THROTTLE_MS) return; // debounce
      lastReset.current = now;
      arm();
    };

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm(); // arranca el contador al montar

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return null;
}
