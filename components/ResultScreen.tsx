"use client";

import { useState } from "react";
import { GeneratedContent } from "@/lib/types";

interface ResultScreenProps {
  content: GeneratedContent;
  onRestart: () => void;
  onRegenerateImage: () => void;
  onRegenerateText: () => void;
  isRegeneratingImage: boolean;
  isRegeneratingText: boolean;
}

export default function ResultScreen({
  content,
  onRestart,
  onRegenerateImage,
  onRegenerateText,
  isRegeneratingImage,
  isRegeneratingText,
}: ResultScreenProps) {
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [copiedText, setCopiedText] = useState(false);

  const downloadImage = async () => {
    if (!content.imagenUrl) return;
    try {
      const response = await fetch(content.imagenUrl);
      const blob = await response.blob();
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

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 pt-6">
      {/* Back button */}
      <button
        onClick={onRestart}
        className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-5 hover:text-gray-700 transition-colors"
      >
        ← Generar otro
      </button>

      {/* Badge info */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}
        >
          {RED_LABELS[content.formData.redSocial]}
        </span>
        {content.formData.formatoInstagram && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
            {content.formData.formatoInstagram}
          </span>
        )}
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
          {content.formData.tono}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(content.fechaCreacion).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Image section (not TikTok) */}
      {!content.esTikTok && content.imagenUrl && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-5">
          <div className="relative">
            {showTextOverlay ? (
              <div className="relative">
                <img
                  src={content.imagenUrl}
                  alt="Imagen generada"
                  className="w-full object-cover"
                  style={{ maxHeight: "400px" }}
                />
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="bg-black bg-opacity-60 rounded-xl p-3 w-full">
                    <p className="text-white text-sm font-semibold leading-relaxed">
                      {overlayText || content.texto.split("\n")[0]}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={content.imagenUrl}
                alt="Imagen generada"
                className="w-full object-cover"
                style={{ maxHeight: "400px" }}
              />
            )}
            {isRegeneratingImage && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-t-2xl">
                <div className="text-center text-white">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm font-semibold">Regenerando imagen...</p>
                </div>
              </div>
            )}
          </div>

          {/* Image action buttons */}
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={downloadImage}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              ⬇️ Descargar imagen
            </button>
            <button
              onClick={onRegenerateImage}
              disabled={isRegeneratingImage}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              🔄 Regenerar imagen
            </button>
            <button
              onClick={() => {
                setShowTextOverlay(!showTextOverlay);
                if (!overlayText) setOverlayText(content.texto.split("\n")[0]);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all"
              style={
                showTextOverlay
                  ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                  : { borderColor: "#e5e7eb", color: "#374151" }
              }
            >
              ✏️ Texto sobre imagen
            </button>
          </div>

          {/* Text overlay editor */}
          {showTextOverlay && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                Texto para superponer
              </label>
              <textarea
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                rows={2}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-naranja resize-none"
                style={{ fontFamily: "Montserrat, sans-serif", borderColor: "#f9b23b" }}
              />
            </div>
          )}
        </div>
      )}

      {/* Image loading placeholder */}
      {!content.esTikTok && !content.imagenUrl && (
        <div
          className="bg-gray-100 rounded-2xl mb-5 flex items-center justify-center"
          style={{ height: "280px" }}
        >
          <div className="text-center text-gray-400">
            <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium">Generando imagen...</p>
          </div>
        </div>
      )}

      {/* TikTok icon */}
      {content.esTikTok && (
        <div
          className="rounded-2xl p-5 mb-5 text-center"
          style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%)" }}
        >
          <div className="text-4xl mb-2">🎵</div>
          <p className="text-white font-bold">Script de TikTok</p>
          <p className="text-gray-400 text-xs mt-1">Guion optimizado para video corto</p>
        </div>
      )}

      {/* Text section */}
      <div className="bg-white rounded-2xl shadow-sm mb-5">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">
            {content.esTikTok ? "Script de TikTok" : "Texto generado"}
          </h3>
          {isRegeneratingText && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Regenerando...
            </span>
          )}
        </div>
        <div className="p-4">
          <pre
            className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {content.texto}
          </pre>
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all hover:bg-gray-50"
            style={
              copiedText
                ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" }
                : { borderColor: "#e5e7eb", color: "#374151" }
            }
          >
            {copiedText ? "✅ Copiado" : "📋 Copiar texto"}
          </button>
          <button
            onClick={downloadText}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}
          >
            ⬇️ Descargar texto
          </button>
          <button
            onClick={onRegenerateText}
            disabled={isRegeneratingText}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}
          >
            🔄 Regenerar texto
          </button>
        </div>
      </div>

      {/* Org info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: "#93bf30" }}
          >
            {content.formData.nombreOrganizacion.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{content.formData.nombreOrganizacion}</p>
            <p className="text-xs text-gray-400">
              {content.formData.tipoOrganizacion} · {content.formData.tono}
              {content.formData.incluirHashtags && " · #hashtags"}
              {content.formData.incluirEmojis && " · emojis"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
