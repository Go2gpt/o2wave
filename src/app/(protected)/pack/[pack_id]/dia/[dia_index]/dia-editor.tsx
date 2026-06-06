"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import ChipsInput from "@/components/ChipsInput";
import Spinner from "@/components/ui/Spinner";
import Toast, { type ToastState } from "@/components/Toast";
import { limpiarMarkdown } from "@/lib/formatText";
import type { PackDia } from "@/types";

const TIPO_BADGE: Record<string, string> = { instagram: "📸 Instagram", facebook: "👥 Facebook", tiktok: "🎵 TikTok" };

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error");
  return data;
}

export default function DiaEditor({ packId, diaIndex, dia }: { packId: string; diaIndex: number; dia: PackDia }) {
  const router = useRouter();
  const esTikTok = dia.tipo === "tiktok";

  const [titular, setTitular] = useState(dia.titular || "");
  const [texto, setTexto] = useState(dia.texto || "");
  const [hashtags, setHashtags] = useState<string[]>(dia.hashtags || []);
  const [imagenUrl, setImagenUrl] = useState<string | null>(dia.imagen_url ?? null);
  const [guion, setGuion] = useState(dia.guion_tiktok || null);

  const [saving, setSaving] = useState(false);
  const [regenT, setRegenT] = useState(false);
  const [regenI, setRegenI] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const btn = "px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-40";
  const btnStyle = { borderColor: "#e5e7eb", color: "#374151" };

  // Regenerar texto (y guion si TikTok). Descarta ediciones manuales.
  const regenerarTexto = async () => {
    setRegenT(true);
    try {
      const { dia: nuevo } = await postJSON("/api/pack/regenerar-dia", { pack_id: packId, dia_index: diaIndex, modo: "texto" });
      const d = nuevo as PackDia;
      setTitular(d.titular || ""); setTexto(d.texto || ""); setHashtags(d.hashtags || []); setGuion(d.guion_tiktok || null);
      setToast({ message: "Texto regenerado", type: "success" });
    } catch (e) { setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" }); }
    finally { setRegenT(false); }
  };

  // Regenerar imagen: primero persiste el titular actual, luego re-hornea.
  const regenerarImagen = async () => {
    setRegenI(true);
    try {
      await postJSON("/api/pack/actualizar-dia", { pack_id: packId, dia_index: diaIndex, cambios: { titular } });
      const { dia: nuevo, sin_imagen } = await postJSON("/api/pack/regenerar-dia", { pack_id: packId, dia_index: diaIndex, modo: "imagen" });
      setImagenUrl((nuevo as PackDia).imagen_url ?? null);
      setToast(sin_imagen
        ? { message: "No se pudo generar la imagen (límite temporal). Reinténtalo en un momento.", type: "info" }
        : { message: "Imagen regenerada", type: "success" });
    } catch (e) { setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" }); }
    finally { setRegenI(false); }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await postJSON("/api/pack/actualizar-dia", { pack_id: packId, dia_index: diaIndex, cambios: { titular, texto, hashtags, imagen_url: imagenUrl } });
      router.push("/pack");
    } catch (e) { setSaving(false); setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" }); }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-10">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-between mb-4">
        <BackLink href="/pack">Pack</BackLink>
        <Logo size="sm" />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>{TIPO_BADGE[dia.tipo] || dia.tipo}</span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">{dia.nombre_dia} · {dia.fecha}</span>
      </div>

      {/* Imagen (solo IG/FB) */}
      {!esTikTok && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="relative w-full bg-gray-100" style={{ paddingTop: dia.tipo === "facebook" ? "56.25%" : "100%" }}>
            {imagenUrl ? (
              <img src={imagenUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400">
                <span className="text-3xl">🖼️</span><span className="text-xs font-medium">Sin imagen</span>
              </div>
            )}
            {regenI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spinner /></div>}
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Titular (se hornea al regenerar la imagen)</label>
              <input value={titular} maxLength={100} onChange={(e) => setTitular(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={regenerarImagen} disabled={regenI} className={btn} style={btnStyle}>{regenI ? "Generando…" : "↻ Regenerar imagen"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Guion TikTok (solo lectura) */}
      {esTikTok && guion && (
        <div className="bg-white rounded-2xl shadow-sm mb-4 p-4 space-y-3">
          {guion.titular && <p className="text-sm font-bold text-gray-900">{guion.titular}</p>}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📜 Guion</p>
            <div className="space-y-2">
              {guion.guion.map((sg, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-2.5">
                  <p className="text-xs font-bold" style={{ color: "#f9b23b" }}>{sg.tiempo}</p>
                  {sg.voz && <p className="text-sm text-gray-800 italic">“{sg.voz}”</p>}
                  {sg.accion && <p className="text-xs text-gray-500 mt-0.5">🎥 {sg.accion}</p>}
                </div>
              ))}
            </div>
          </div>
          {guion.planos.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🎬 Planos</p>
              <ol className="space-y-1">{guion.planos.map((p) => <li key={p.numero} className="text-sm text-gray-700">{p.numero}. {p.descripcion}</li>)}</ol>
            </div>
          )}
          {guion.audio_sugerido && <p className="text-xs text-gray-500">🎵 {guion.audio_sugerido}</p>}
          <p className="text-[11px] text-gray-400">El guion se edita regenerando el texto. El texto y los hashtags de abajo sí son editables.</p>
        </div>
      )}

      {/* Texto editable */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Texto del post</label>
          <textarea value={limpiarMarkdown(texto)} rows={6} onChange={(e) => setTexto(e.target.value)}
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none resize-none"
            onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hashtags</label>
          <ChipsInput value={hashtags} onChange={setHashtags} placeholder="Añadir hashtag" />
        </div>
        <button onClick={regenerarTexto} disabled={regenT} className={btn} style={btnStyle}>{regenT ? "Generando…" : "↻ Regenerar texto"}</button>
      </div>

      <button onClick={guardar} disabled={saving}
        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
        style={{ backgroundColor: "#f9b23b" }}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
