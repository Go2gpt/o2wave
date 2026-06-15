"use client";

import type { RedSocial } from "@/types";

interface Props {
  redSocial: RedSocial;
  formato?: string | null;
  caption: string;
  onClose: () => void;
}

// Esquemas de app (abren la app en su feed normal, NO en Reel) + fallback web.
const APP: Record<string, { scheme: string; web: string; nombre: string }> = {
  Instagram: { scheme: "instagram://", web: "https://www.instagram.com", nombre: "Instagram" },
  Facebook: { scheme: "fb://", web: "https://www.facebook.com", nombre: "Facebook" },
  WhatsApp: { scheme: "whatsapp://send", web: "https://web.whatsapp.com", nombre: "WhatsApp" },
};

function pasos(red: RedSocial, esStory: boolean): string[] {
  if (red === "Instagram" && esStory) {
    return [
      "Abre Instagram desde el icono.",
      "Pulsa tu foto de perfil (abajo derecha) o el «+» → «Historia».",
      "Selecciona la imagen recién guardada (la primera del carrete).",
      "El caption está copiado: añade un cuadro de texto y pégalo si quieres.",
      "Publica tu historia.",
    ];
  }
  if (red === "Instagram") {
    return [
      "Abre Instagram desde el icono.",
      "Pulsa el «+» abajo en el centro.",
      "Desliza la barra inferior a «PUBLICACIÓN».",
      "Selecciona la imagen (será la primera, recién guardada).",
      "Si Instagram la recorta, pulsa el icono ↔ arriba a la izquierda.",
      "Pulsa «Siguiente», pega el caption (ya copiado) y publica.",
    ];
  }
  if (red === "Facebook") {
    return [
      "Abre Facebook desde el icono.",
      "Pulsa «Crear publicación» / «¿Qué estás pensando?».",
      "Añade la imagen recién guardada desde tu galería.",
      "Pega el caption (ya copiado) y publica.",
    ];
  }
  if (red === "WhatsApp") {
    return [
      "Abre WhatsApp y elige el chat o estado.",
      "Adjunta la imagen recién guardada desde tu galería.",
      "Pega el texto (ya copiado) como mensaje o pie de foto.",
      "Envía.",
    ];
  }
  return ["Abre la app, sube la imagen guardada y pega el texto (ya copiado)."];
}

export default function PublishInstructionsModal({ redSocial, formato, caption, onClose }: Props) {
  const esStory = formato === "Story 9:16";
  const app = APP[redSocial];
  const lista = pasos(redSocial, esStory);

  const abrirApp = () => {
    if (!app) return;
    // WhatsApp lleva el texto en el propio enlace; el resto abre el feed normal.
    const url = redSocial === "WhatsApp" ? `whatsapp://send?text=${encodeURIComponent(caption)}` : app.scheme;
    const fallback = redSocial === "WhatsApp" ? `https://wa.me/?text=${encodeURIComponent(caption)}` : app.web;
    const t = setTimeout(() => { window.open(fallback, "_blank", "noopener,noreferrer"); }, 1200);
    window.addEventListener("blur", () => clearTimeout(t), { once: true });
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: "#f0f7e6" }}>
          <span className="text-xl">✓</span>
          <p className="text-sm font-bold" style={{ color: "#3f6212" }}>Imagen guardada en tu galería</p>
        </div>
        <h3 className="font-bold text-gray-900 mb-1">
          Cómo publicar{esStory ? " tu historia" : ""} en {app?.nombre || redSocial}
        </h3>
        <p className="text-xs text-gray-400 mb-3">El caption ya está copiado en tu portapapeles.</p>
        <ol className="space-y-2 mb-4">
          {lista.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: "#f9b23b" }}>{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
        {app && (
          <button onClick={abrirApp} className="w-full py-3 rounded-2xl font-bold text-white text-sm" style={{ backgroundColor: "#f9b23b" }}>
            Abrir {app.nombre}
          </button>
        )}
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-500 font-medium">Cerrar</button>
      </div>
    </div>
  );
}
