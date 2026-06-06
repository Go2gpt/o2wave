"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Botón manual de instalación de la PWA (para /perfil). */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [mostrarIOS, setMostrarIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || iosStandalone) { setInstalada(true); return; }

    const ua = window.navigator.userAgent;
    setEsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (instalada) return null;

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else if (esIOS) {
      setMostrarIOS((v) => !v);
    }
  };

  return (
    <div>
      <button onClick={click}
        className="w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all"
        style={{ borderColor: "#e5e7eb", color: "#374151" }}>
        📲 Instalar app
      </button>
      {esIOS && mostrarIOS && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed px-1">
          En iPhone: pulsa el botón <strong>Compartir</strong>
          <svg className="inline-block mx-1 -mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
          </svg>
          y luego &quot;Añadir a pantalla de inicio&quot;.
        </p>
      )}
    </div>
  );
}
