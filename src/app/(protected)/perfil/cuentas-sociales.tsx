"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface CuentaSocial {
  id: string;
  etiqueta: string;
  ig_username: string | null;
  fb_page_nombre: string | null;
  es_predeterminada: boolean;
}

const ERRORES: Record<string, string> = {
  config: "La conexión con Meta no está configurada. Avísanos.",
  denegado: "Has cancelado la conexión.",
  state: "La sesión de conexión caducó. Inténtalo de nuevo.",
  sin_paginas: "No encontramos ninguna Página de Facebook con una cuenta de Instagram Business vinculada. Recuerda: la cuenta de Instagram debe ser Business/Creator y estar vinculada a una Página de Facebook.",
  intercambio: "Hubo un problema al conectar con Meta. Inténtalo de nuevo.",
};

export default function CuentasSociales({ cuentas }: { cuentas: CuentaSocial[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  useEffect(() => {
    const conectadas = params.get("social_connected");
    const error = params.get("social_error");
    if (conectadas) setAviso({ tipo: "ok", msg: `Conectada${Number(conectadas) === 1 ? "" : "s"} ${conectadas} cuenta${Number(conectadas) === 1 ? "" : "s"}.` });
    else if (error) setAviso({ tipo: "error", msg: ERRORES[error] || "No se pudo conectar la cuenta." });
    if (conectadas || error) window.history.replaceState({}, "", "/perfil");
  }, [params]);

  const gestionar = async (accion: "default" | "desconectar", id: string) => {
    if (accion === "desconectar" && !confirm("¿Desconectar esta cuenta? Dejarás de poder publicar en ella desde o2Wave.")) return;
    setCargando(id);
    try {
      const res = await fetch("/api/social/gestionar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      router.refresh();
    } catch (e) {
      setAviso({ tipo: "error", msg: e instanceof Error ? e.message : "Error" });
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
        <h2 className="font-black text-gray-900">Cuentas conectadas</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Conecta tus cuentas para publicar directamente desde o2Wave y elegir el destino de cada post, sin depender de qué cuenta tengas abierta en el móvil.
        </p>

        {aviso && (
          <div className="mt-3 rounded-xl px-3 py-2 text-sm font-medium"
            style={aviso.tipo === "ok"
              ? { backgroundColor: "#f0f7e6", color: "#3f6212" }
              : { backgroundColor: "#fef2f2", color: "#b91c1c" }}>
            {aviso.msg}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {cuentas.length === 0 && (
            <p className="text-sm text-gray-400">Aún no has conectado ninguna cuenta.</p>
          )}
          {cuentas.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {c.ig_username ? `@${c.ig_username}` : c.etiqueta}
                  {c.es_predeterminada && (
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle" style={{ backgroundColor: "#93bf30", color: "#fff" }}>Predeterminada</span>
                  )}
                </p>
                {c.fb_page_nombre && <p className="text-xs text-gray-500 truncate">Página: {c.fb_page_nombre}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!c.es_predeterminada && (
                  <button onClick={() => gestionar("default", c.id)} disabled={cargando === c.id}
                    className="text-xs font-semibold disabled:opacity-50" style={{ color: "#93bf30" }}>
                    Hacer predeterminada
                  </button>
                )}
                <button onClick={() => gestionar("desconectar", c.id)} disabled={cargando === c.id}
                  className="text-xs font-semibold text-red-500 disabled:opacity-50">
                  Desconectar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <span className="text-base leading-none">💻</span>
          <p className="text-xs leading-relaxed" style={{ color: "#1e40af" }}>
            <strong>Conecta desde un ordenador.</strong> El proceso de permisos de Meta es bastante más sencillo en el navegador de un ordenador que en el móvil. Una vez conectada, podrás publicar desde el teléfono sin problema.
          </p>
        </div>

        <a href="/api/meta/oauth/user-start"
          className="mt-3 block w-full text-center py-3 rounded-xl font-bold text-white text-sm active:scale-[0.98] transition-all"
          style={{ backgroundColor: "#f9b23b" }}>
          + Conectar una cuenta
        </a>
        <p className="text-[11px] text-gray-400 leading-relaxed mt-2">
          Solo cuentas de Instagram Business/Creator vinculadas a una Página de Facebook. Las cuentas personales de Instagram no se pueden publicar por API.
        </p>
      </div>
    </div>
  );
}
