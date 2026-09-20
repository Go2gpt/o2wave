"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CuentaOpt {
  id: string;
  etiqueta: string;
  ig_username: string | null;
  es_predeterminada: boolean;
}

// Publica el post directamente (server-side) en la cuenta conectada elegida.
// Solo para Instagram/Facebook (el resto va por Compartir nativo). Se auto-oculta
// si la red no aplica.
export default function PublicarEnCuenta({ redSocial, texto, imagenUrl }: {
  redSocial: string; texto: string; imagenUrl: string | null;
}) {
  const soportado = redSocial === "Instagram" || redSocial === "Facebook";
  const [cuentas, setCuentas] = useState<CuentaOpt[] | null>(null);
  const [sel, setSel] = useState("");
  const [pub, setPub] = useState(false);
  const [res, setRes] = useState<{ tipo: "ok" | "error"; msg: string; url?: string } | null>(null);

  useEffect(() => {
    if (!soportado) return;
    fetch("/api/social/cuentas")
      .then((r) => r.json())
      .then((d) => {
        const cs: CuentaOpt[] = d.cuentas || [];
        setCuentas(cs);
        const def = cs.find((c) => c.es_predeterminada) || cs[0];
        if (def) setSel(def.id);
      })
      .catch(() => setCuentas([]));
  }, [soportado]);

  if (!soportado) return null;

  const publicar = async () => {
    if (!sel) return;
    setPub(true); setRes(null);
    try {
      const r = await fetch("/api/social/publicar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuenta_id: sel, texto, imagen_url: imagenUrl, red_social: redSocial }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setRes({ tipo: "ok", msg: "¡Publicado!", url: d.url });
    } catch (e) {
      setRes({ tipo: "error", msg: e instanceof Error ? e.message : "Error al publicar" });
    } finally {
      setPub(false);
    }
  };

  return (
    <div className="px-4 pt-1 pb-3">
      <div className="rounded-xl p-3" style={{ backgroundColor: "#fff8ef", border: "1px solid #f9d9a8" }}>
        <p className="text-sm font-bold" style={{ color: "#b9791a" }}>Publicar en tu cuenta · {redSocial}</p>
        {cuentas === null ? (
          <p className="text-xs text-gray-400 mt-1">Cargando cuentas…</p>
        ) : cuentas.length === 0 ? (
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Conecta una cuenta en tu{" "}
            <Link href="/perfil" className="font-semibold" style={{ color: "#f9b23b" }}>perfil</Link>{" "}
            para publicar directamente aquí, sin depender de la cuenta que tengas abierta en el móvil.
          </p>
        ) : (
          <>
            <select value={sel} onChange={(e) => setSel(e.target.value)}
              className="mt-2 w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none">
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ig_username ? `@${c.ig_username}` : c.etiqueta}{c.es_predeterminada ? " (predeterminada)" : ""}
                </option>
              ))}
            </select>
            <button onClick={publicar} disabled={pub || !sel}
              className="mt-2 w-full py-2.5 rounded-xl font-bold text-white text-sm active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ backgroundColor: "#f9b23b" }}>
              {pub ? "Publicando…" : `Publicar en ${redSocial}`}
            </button>
          </>
        )}
        {res && (
          <div className="mt-2 text-sm font-medium" style={{ color: res.tipo === "ok" ? "#3f6212" : "#b91c1c" }}>
            {res.tipo === "ok" ? "✓ ¡Publicado!" : `⚠️ ${res.msg}`}
            {res.url && <> · <a href={res.url} target="_blank" rel="noopener" className="underline">ver publicación</a></>}
          </div>
        )}
      </div>
    </div>
  );
}
