"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { limpiarMarkdown, quitarHashtags } from "@/lib/formatText";
import PublishInstructionsModal from "@/components/PublishInstructionsModal";
import type { PackSemanal, PackDia, RedSocial } from "@/types";

const TIPO_BADGE: Record<string, string> = { instagram: "📸 Instagram", facebook: "👥 Facebook", tiktok: "🎵 TikTok" };
// Red de la pieza (badge en minúsculas) → RedSocial del modal de publicación.
const RED_MAP: Record<string, RedSocial> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

function rango(fechaInicio: string): string {
  const ini = new Date(fechaInicio + "T12:00:00");
  const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `Semana del ${f(ini)} al ${f(fin)}`;
}

function DiaCard({ packId, dia, idx, onSustituir, onEliminar }: {
  packId: string; dia: PackDia; idx: number;
  onSustituir: (idx: number) => void; onEliminar: (idx: number) => void;
}) {
  const [pubOpen, setPubOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const red = RED_MAP[dia.tipo] || "Instagram";

  // Caption completo = cuerpo (sin hashtags duplicados) + hashtags al final.
  const caption = () => {
    const cuerpo = quitarHashtags(limpiarMarkdown(dia.texto || "")).trim();
    const tags = dia.hashtags && dia.hashtags.length ? `\n\n${dia.hashtags.join(" ")}` : "";
    return `${cuerpo}${tags}`.trim();
  };

  // Mismo flujo que el post suelto: copiar caption + Compartir nativo (el menú del
  // sistema deja elegir la red). Sin API: NO publica solo. En escritorio/TikTok o
  // sin soporte de share, cae al modal guiado (copia texto + abrir la app).
  const publicar = async () => {
    const texto = caption();
    try { await navigator.clipboard?.writeText(texto); } catch { /* no soportado */ }

    if (dia.imagen_url && dia.tipo !== "tiktok") {
      try {
        setSharing(true);
        const resp = await fetch(dia.imagen_url);
        const blob = await resp.blob();
        const file = new File([blob], "o2wave.png", { type: blob.type || "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: texto });
          return; // compartido por el menú nativo
        }
        // Escritorio (sin share de archivos): descarga la imagen para la guía.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "o2wave.png"; a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return; // el usuario canceló el share
        // cualquier otro fallo → sigue al modal guiado
      } finally { setSharing(false); }
    }
    setPubOpen(true); // fallback guiado (escritorio / TikTok / sin imagen)
  };

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-700">{dia.nombre_dia}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200">{TIPO_BADGE[dia.tipo] || dia.tipo}</span>
        {dia.fuente === "fecha_usuario" && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>⭐ Mi fecha</span>}
      </div>
      {dia.tipo !== "tiktok" && (
        dia.imagen_url
          ? <img src={dia.imagen_url} alt="" className="w-full object-cover" />
          : <div className="w-full bg-gray-100 flex flex-col items-center justify-center gap-1 text-gray-400" style={{ paddingTop: "12px", paddingBottom: "12px", minHeight: 96 }}>
              <span className="text-2xl">🖼️</span><span className="text-[11px] font-medium">Sin imagen — edítalo para generarla</span>
            </div>
      )}
      <div className="p-3">
        <p className="text-xs font-bold" style={{ color: "#f9b23b" }}>{dia.tema}</p>
        {dia.titular && <p className="text-sm font-bold text-gray-900 mt-1">{dia.titular}</p>}
        <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{quitarHashtags(limpiarMarkdown(dia.texto || ""))}</p>
        {dia.hashtags && dia.hashtags.length > 0 && <p className="text-xs mt-2" style={{ color: "#1e40af" }}>{dia.hashtags.join(" ")}</p>}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Link href={`/pack/${packId}/dia/${idx}`} className="px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all active:scale-95" style={{ borderColor: "#e5e7eb", color: "#374151" }}>✏️ Editar</Link>
          <button onClick={() => onSustituir(idx)} className="px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all active:scale-95" style={{ borderColor: "#e5e7eb", color: "#374151" }}>↻ Sustituir</button>
          <button onClick={() => onEliminar(idx)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95" style={{ color: "#ef4444" }}>🗑️ Eliminar</button>
          <button onClick={publicar} disabled={sharing} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50" style={{ backgroundColor: "#93bf30" }}>{sharing ? "…" : "📤 Publicar"}</button>
        </div>
      </div>
      {pubOpen && <PublishInstructionsModal redSocial={red} formato={null} caption={caption()} onClose={() => setPubOpen(false)} />}
    </div>
  );
}

export default function PackList({ packs, abrirInicial }: { packs: PackSemanal[]; abrirInicial?: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<string | null>(abrirInicial ?? null);
  const [toast, setToast] = useState<ToastState>(null);
  const [sust, setSust] = useState<{ packId: string; idx: number; tema: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const descargarPdf = (pack: PackSemanal) => window.open(`/api/pack/${pack.id}/pdf`, "_blank");

  const eliminarDia = async (packId: string, idx: number) => {
    if (!confirm("¿Eliminar este día del pack?")) return;
    try {
      const res = await fetch("/api/pack/eliminar-dia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_id: packId, dia_index: idx }) });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setToast({ message: "Día eliminado", type: "success" });
      router.refresh();
    } catch (e) { setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" }); }
  };

  const borrarPack = async (packId: string) => {
    if (!confirm("¿Borrar este pack? Se eliminarán todos los días y la imagen. No se puede deshacer.")) return;
    setBorrandoId(packId);
    try {
      const res = await fetch(`/api/pack/${packId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error");
      setAbierto((a) => (a === packId ? null : a));
      setToast({ message: "Pack eliminado", type: "success" });
      router.refresh();
    } catch (e) {
      setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" });
    } finally {
      setBorrandoId(null);
    }
  };

  const confirmarSustituir = async () => {
    if (!sust) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pack/regenerar-dia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: sust.packId, dia_index: sust.idx, nuevo_tema: sust.tema.trim() || undefined, modo: "completo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSust(null);
      setToast(data.sin_imagen
        ? { message: "Día regenerado (sin imagen por límite temporal; reinténtala desde Editar).", type: "info" }
        : { message: "Día regenerado", type: "success" });
      router.refresh();
    } catch (e) { setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" }); }
    finally { setBusy(false); }
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
        <p className="text-sm text-gray-500 mt-0.5">Tu plan de contenido, listo cada semana</p>
      </div>

      {packs.length === 0 ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Aún no tienes packs generados</p>
            <p className="text-xs text-gray-400">Si activaste el pack semanal en tu perfil, recibirás el primero el próximo lunes por la mañana.</p>
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setAbierto(open ? null : p.id)}
                      className="px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95"
                      style={{ borderColor: "#e5e7eb", color: "#374151" }}>{open ? "Ocultar" : "Ver pack"}</button>
                    <button onClick={() => borrarPack(p.id)} disabled={borrandoId === p.id} aria-label="Borrar pack"
                      className="px-2.5 py-2 rounded-xl text-sm transition-all active:scale-95 hover:bg-red-50 disabled:opacity-50"
                      style={{ color: "#ef4444" }}>{borrandoId === p.id ? "…" : "🗑️"}</button>
                  </div>
                </div>
                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                    <button onClick={() => descargarPdf(p)}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98]"
                      style={{ backgroundColor: "#f9b23b" }}>📥 Descargar PDF final</button>
                    {dias.length === 0
                      ? <p className="text-xs text-gray-400 pt-1">Este pack no tiene contenido.</p>
                      : dias.map((d, i) => <DiaCard key={i} packId={p.id} dia={d} idx={i} onSustituir={(idx) => setSust({ packId: p.id, idx, tema: "" })} onEliminar={(idx) => eliminarDia(p.id, idx)} />)}
                    <div className="text-right pt-1">
                      <button onClick={() => borrarPack(p.id)} disabled={borrandoId === p.id}
                        className="text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                        style={{ color: "#ef4444" }}>{borrandoId === p.id ? "Borrando…" : "🗑️ Borrar pack"}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal sustituir */}
      {sust && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4" onClick={() => !busy && setSust(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Sustituir este día</h3>
            <p className="text-xs text-gray-400 mb-4">Escribe un nuevo tema (o déjalo vacío para que la IA proponga uno). Se regenerará el texto y la imagen.</p>
            <input value={sust.tema} onChange={(e) => setSust({ ...sust, tema: e.target.value })}
              placeholder="Nuevo tema para este día (opcional)" maxLength={120}
              className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
              onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} autoFocus />
            <button onClick={confirmarSustituir} disabled={busy}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm mt-4 disabled:opacity-50" style={{ backgroundColor: "#f9b23b" }}>
              {busy ? "Regenerando…" : "Regenerar día"}
            </button>
            <button onClick={() => setSust(null)} disabled={busy} className="w-full py-2.5 text-sm text-gray-500 font-medium">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
