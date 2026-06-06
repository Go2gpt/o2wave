"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { createClient } from "@/lib/supabase";
import { limpiarMarkdown } from "@/lib/formatText";
import type { PackSemanal, PackDia } from "@/types";

const TIPO_BADGE: Record<string, string> = { instagram: "📸 Instagram", facebook: "👥 Facebook", tiktok: "🎵 TikTok" };

function rango(fechaInicio: string): string {
  const ini = new Date(fechaInicio + "T12:00:00");
  const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `Semana del ${f(ini)} al ${f(fin)}`;
}

function DiaCard({ d }: { d: PackDia }) {
  const [copied, setCopied] = useState(false);
  const copiar = () => {
    const txt = [d.titular, limpiarMarkdown(d.texto || ""), (d.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-700">{d.nombre_dia}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200">
          {TIPO_BADGE[d.tipo] || d.tipo}
        </span>
        {d.fuente === "fecha_usuario" && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>⭐ Mi fecha</span>
        )}
      </div>
      {d.imagen_url && <img src={d.imagen_url} alt="" className="w-full object-cover" />}
      <div className="p-3">
        <p className="text-xs font-bold" style={{ color: "#f9b23b" }}>{d.tema}</p>
        {d.titular && <p className="text-sm font-bold text-gray-900 mt-1">{d.titular}</p>}
        <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{limpiarMarkdown(d.texto || "")}</p>
        {d.hashtags && d.hashtags.length > 0 && (
          <p className="text-xs mt-2" style={{ color: "#1e40af" }}>{d.hashtags.join(" ")}</p>
        )}
        <button onClick={copiar}
          className="mt-3 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all active:scale-95"
          style={copied ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" } : { borderColor: "#e5e7eb", color: "#374151" }}>
          {copied ? "✓ Copiado" : "📋 Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function PackList({ packs }: { packs: PackSemanal[] }) {
  const supabase = createClient();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const descargarPdf = async (pack: PackSemanal) => {
    if (!pack.pdf_url) { setToast({ message: "Este pack aún no tiene PDF disponible.", type: "info" }); return; }
    // Si es URL completa, abrir directamente; si es una ruta de Storage, firmar.
    if (/^https?:\/\//.test(pack.pdf_url)) { window.open(pack.pdf_url, "_blank"); return; }
    const { data, error } = await supabase.storage.from("packs-pdf").createSignedUrl(pack.pdf_url, 60);
    if (error || !data?.signedUrl) { setToast({ message: "No se pudo generar el enlace del PDF.", type: "error" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dashboard">Inicio</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Pack semanal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu plan de contenido, listo cada domingo</p>
      </div>

      {packs.length === 0 ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Aún no tienes packs generados</p>
            <p className="text-xs text-gray-400">Si activaste el pack semanal en tu perfil, recibirás el primero el próximo domingo por la noche.</p>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-3">
          {packs.map((p) => {
            const dias = p.contenido?.dias || [];
            const open = abierto === p.id;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{rango(p.fecha_inicio)}</p>
                    <p className="text-xs text-gray-400">{dias.length} {dias.length === 1 ? "día" : "días"} de contenido</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setAbierto(open ? null : p.id)}
                      className="px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95"
                      style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                      {open ? "Ocultar" : "Ver pack"}
                    </button>
                    <button onClick={() => descargarPdf(p)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                      style={{ backgroundColor: "#f9b23b" }}>
                      ↓ PDF
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                    {dias.length === 0
                      ? <p className="text-xs text-gray-400 pt-3">Este pack no tiene contenido.</p>
                      : dias.map((d, i) => <DiaCard key={i} d={d} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
