"use client";

import { GeneratedContent } from "@/lib/types";

interface HistoryScreenProps {
  history: GeneratedContent[];
  onSelect: (content: GeneratedContent) => void;
  onClear: () => void;
}

const RED_ICONS: Record<string, string> = {
  Instagram: "📸",
  Facebook: "👥",
  TikTok: "🎵",
};

export default function HistoryScreen({ history, onSelect, onClear }: HistoryScreenProps) {
  if (history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-12 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">Aún no hay contenido</h3>
        <p className="text-sm text-gray-400">
          El contenido que generes aparecerá aquí para que puedas acceder a él fácilmente.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Historial</h2>
          <p className="text-xs text-gray-400">{history.length} publicaciones generadas</p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
        >
          Limpiar todo
        </button>
      </div>

      <div className="space-y-3">
        {history
          .slice()
          .reverse()
          .map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200 text-left"
            >
              {/* Thumbnail */}
              <div
                className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#f3f4f6" }}
              >
                {item.imagenUrl ? (
                  <img
                    src={item.imagenUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{RED_ICONS[item.formData.redSocial] || "📄"}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}
                  >
                    {RED_ICONS[item.formData.redSocial]} {item.formData.redSocial}
                  </span>
                  {item.formData.formatoInstagram && (
                    <span className="text-xs text-gray-400">
                      {item.formData.formatoInstagram === "Post 1080×1080" ? "Post" : "Story"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5 truncate">
                  {item.formData.nombreOrganizacion}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {item.texto.slice(0, 80)}...
                </p>
              </div>

              {/* Date */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-400">
                  {new Date(item.fechaCreacion).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-xs text-gray-300">
                  {new Date(item.fechaCreacion).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <span className="text-gray-300 text-lg mt-1 block">›</span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
