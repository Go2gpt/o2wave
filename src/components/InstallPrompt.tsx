"use client";

import { useEffect, useState } from "react";

// Nota: el botón manual "Instalar app" ya existe en /perfil (InstallButton)
// para usuarios que rechazaron este banner.

const DISMISS_KEY = "o2wave-install-dismissed-at";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 10_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function rechazadoRecientemente(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ms = DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - Number(ts) < ms;
  } catch {
    return false;
  }
}

function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS expone navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (estaInstalada() || rechazadoRecientemente()) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;

    let timer: ReturnType<typeof setTimeout> | null = null;

    // Muestra el banner tras el delay, pero solo si en ese momento sigue sin
    // estar instalada ni rechazada recientemente (re-chequea por si cambió).
    const mostrarTrasDelay = () => {
      timer = setTimeout(() => {
        if (estaInstalada() || rechazadoRecientemente()) return;
        setVisible(true);
      }, SHOW_DELAY_MS);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Chrome puede re-disparar este evento al navegar entre rutas del SPA;
      // si el usuario ya lo rechazó (o la instaló), no reabrimos el banner.
      if (estaInstalada() || rechazadoRecientemente()) return;
      mostrarTrasDelay();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari no dispara beforeinstallprompt → mostramos instrucciones
    if (ios) {
      setEsIOS(true);
      mostrarTrasDelay();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[60] px-4 animate-[o2slideup_0.3s_ease-out]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <style>{`@keyframes o2slideup { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div className="mx-auto max-w-md sm:max-w-sm sm:ml-auto sm:mr-0 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">📱</span>
          <div className="flex-1 min-w-0">
            {esIOS ? (
              <>
                <p className="text-sm font-bold text-gray-900">Instala o2Wave en tu iPhone</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Pulsa el botón Compartir
                  <svg className="inline-block mx-1 -mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                  </svg>
                  y luego &quot;Añadir a pantalla de inicio&quot;.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">Instala o2Wave en tu móvil</p>
                <p className="text-xs text-gray-500 mt-0.5">Acceso rápido, sin abrir el navegador.</p>
              </>
            )}
            <div className="flex items-center gap-2 mt-3">
              {!esIOS && (
                <button onClick={install}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ backgroundColor: "#f9b23b" }}>
                  Instalar
                </button>
              )}
              <button onClick={dismiss} className="px-3 py-2 text-sm font-medium text-gray-400">
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
