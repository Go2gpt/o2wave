"use client";

import { useState } from "react";
import { GeneratedContent, OverlayPosition } from "@/lib/types";

interface ResultScreenProps {
  content: GeneratedContent;
  onRestart: () => void;
  onRegenerateImage: () => void;
  onRegenerateText: () => void;
  isRegeneratingImage: boolean;
  isRegeneratingText: boolean;
}

const OVERLAY_POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: "top", label: "Arriba" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Abajo" },
];

const OVERLAY_JUSTIFY: Record<OverlayPosition, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

export default function ResultScreen({
  content,
  onRestart,
  onRegenerateImage,
  onRegenerateText,
  isRegeneratingImage,
  isRegeneratingText,
}: ResultScreenProps) {
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>("bottom");
  const [copiedText, setCopiedText] = useState(false);

  const isStory = content.formData.formatoInstagram === "Story 9:16";

  const downloadImage = async () => {
    if (!content.imagenUrl) return;
    try {
      const res = await fetch(content.imagenUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `o2wave-${content.formData.redSocial.toLowerCase()}-${content.id}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(content.imagenUrl, "_blank");
    }
  };

  const downloadText = () => {
    const blob = new Blob([content.texto], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `o2wave-texto-${content.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const copyText = () => {
    navigator.clipboard.writeText(content.texto);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const RED_LABELS: Record<string, string> = {
    Instagram: "📸 Instagram",
    Facebook: "👥 Facebook",
    TikTok: "🎵 TikTok",
  };

  // Button style helpers
  const btnBase = "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-150 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed";
  const btnNeutral = { borderColor: "#e5e7eb", color: "#374151" };
  const btnActive = { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" };

  return (
    <div className="max-w-lg mx-auto px-4 pb-12 pt-5">
      {/* Back */}
      <button
        onClick={onRestart}
        className="flex items-center gap-1.5 text-sm text-gray-500 font-semibold mb-4 hover:text-gray-800 transition-colors"
      >
        ← Generar otro
      </button>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
          {RED_LABELS[content.formData.redSocial]}
        </span>
        {content.formData.formatoInstagram && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
            {content.formData.formatoInstagram === "Story 9:16" ? "Story" : "Post 1080×1080"}
          </span>
        )}
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
          {content.formData.tono}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(content.fechaCreacion).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* ── IMAGE BLOCK (non-TikTok) ── */}
      {!content.esTikTok && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">

          {/* Canvas con aspect ratio dinámico */}
          <div
            className="relative w-full bg-gray-100"
            style={{ paddingTop: isStory ? "177.78%" : "100%" }}
          >
            {content.imagenUrl ? (
              <>
                <img
                  src={content.imagenUrl}
                  alt="Imagen generada"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlay de texto sobre imagen */}
                {showOverlayEditor && overlayText && (
                  <div className={`absolute inset-0 flex flex-col ${OVERLAY_JUSTIFY[overlayPosition]} p-4 pointer-events-none`}>
                    <div className="bg-black/60 rounded-xl px-3 py-2 max-w-full backdrop-blur-sm">
                      <p className="text-white text-sm font-bold leading-snug">{overlayText}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Loading placeholder */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-semibold text-gray-400">Generando tu contenido...</p>
              </div>
            )}

            {/* Loading overlay cuando regenera */}
            {isRegeneratingImage && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-semibold text-white">Generando tu contenido...</p>
              </div>
            )}
          </div>

          {/* Fila 1 de botones: Imagen | Regenerar imagen | Editar texto */}
          <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
            <button onClick={downloadImage} disabled={!content.imagenUrl} className={btnBase} style={btnNeutral}>
              ↓ Imagen
            </button>
            <button onClick={onRegenerateImage} disabled={isRegeneratingImage || !content.imagenUrl} className={btnBase} style={btnNeutral}>
              ↻ Regenerar imagen
            </button>
            <button
              onClick={() => {
                setShowOverlayEditor(!showOverlayEditor);
                if (!overlayText) setOverlayText(content.texto.split("\n").find(l => l.trim()) || "");
              }}
              className={btnBase}
              style={showOverlayEditor ? btnActive : btnNeutral}
            >
              ✎ Editar texto
            </button>
          </div>

          {/* Editor de overlay con selector de posición */}
          {showOverlayEditor && (
            <div className="mx-4 mb-3 mt-1 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Texto sobre imagen
                </p>
                <div className="flex gap-1">
                  {OVERLAY_POSITIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOverlayPosition(value)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                      style={
                        overlayPosition === value
                          ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                          : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                rows={2}
                placeholder="Escribe el texto que aparecerá sobre la imagen..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                style={{ fontFamily: "inherit", borderColor: "#f9b23b" }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── TIKTOK HEADER ── */}
      {content.esTikTok && (
        <div
          className="rounded-2xl p-5 mb-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}
        >
          <span className="text-4xl">🎵</span>
          <div>
            <p className="text-white font-bold text-sm">Script de TikTok</p>
            <p className="text-gray-400 text-xs mt-0.5">Guion estructurado para video corto</p>
          </div>
        </div>
      )}

      {/* ── TEXT BLOCK ── */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {content.esTikTok ? "Script de TikTok" : "Texto generado"}
          </h3>
          {isRegeneratingText && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generando tu contenido...
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          <pre
            className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: "inherit" }}
          >
            {content.texto}
          </pre>
        </div>

        {/* Fila 2 de botones: Texto | Regenerar texto */}
        <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex gap-2 flex-wrap">
          <button onClick={copyText} className={btnBase}
            style={copiedText ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" } : btnNeutral}>
            {copiedText ? "✓ Copiado" : "📋 Copiar"}
          </button>
          <button onClick={downloadText} className={btnBase} style={btnNeutral}>
            ↓ Texto
          </button>
          <button onClick={onRegenerateText} disabled={isRegeneratingText} className={btnBase} style={btnNeutral}>
            ↻ Regenerar texto
          </button>
        </div>
      </div>

      {/* Org info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: "#93bf30" }}
        >
          {content.formData.nombreOrganizacion.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{content.formData.nombreOrganizacion}</p>
          <p className="text-xs text-gray-400">
            {content.formData.tipoOrganizacion} · {content.formData.tono}
            {content.formData.incluirHashtags && " · #hashtags"}
            {content.formData.incluirEmojis && " · emojis"}
          </p>
        </div>
      </div>
    </div>
  );
}
