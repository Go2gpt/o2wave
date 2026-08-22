"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface ItemNovedad {
  icono: string;
  titulo: string;
  descripcion: string;
}

interface Props {
  /** Columna BOOLEAN en profiles que marca este anuncio como visto (p.ej. popup_novedades_v1_visto). */
  columna: string;
  titulo: string;
  subtitulo: string;
  items: ItemNovedad[];
  ctaPrincipal: { label: string; href: string };
  ctaSecundario?: { label: string; href: string };
}

/**
 * Popup de novedades reutilizable. Se muestra una vez por usuario: al cerrarlo o
 * usar un CTA, marca `columna = true` en su perfil. Para futuros anuncios, se
 * reusa con otra columna (popup_novedades_v2_visto, etc.). Tolerante: si la
 * columna aún no existe, no rompe (solo no persiste).
 */
export default function NovedadesPopup({ columna, titulo, subtitulo, items, ctaPrincipal, ctaSecundario }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Se muestra una vez por dispositivo vía localStorage (sin migración). El guardado
  // en BD sigue como extra tolerante en marcarVisto (por si la columna existe).
  useEffect(() => {
    try { if (!localStorage.getItem(`novedad_${columna}`)) setAbierto(true); } catch { setAbierto(true); }
  }, [columna]);

  const marcarVisto = async () => {
    try { localStorage.setItem(`novedad_${columna}`, "1"); } catch { /* sin localStorage */ }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ [columna]: true }).eq("id", user.id);
    } catch { /* tolerante: la columna puede no existir aún */ }
  };

  const cerrar = async () => {
    if (ocupado) return;
    setOcupado(true);
    await marcarVisto();
    setAbierto(false);
  };

  const irPrincipal = async () => {
    if (ocupado) return;
    setOcupado(true);
    await marcarVisto();
    router.push(ctaPrincipal.href);
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cerrar}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={cerrar} aria-label="Cerrar" disabled={ocupado}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-50">✕</button>

        <h2 className="text-xl font-black text-gray-900 pr-6">{titulo}</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">{subtitulo}</p>

        <ul className="space-y-3 mb-5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0" aria-hidden="true">{it.icono}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{it.titulo}</p>
                <p className="text-xs text-gray-500 leading-snug">{it.descripcion}</p>
              </div>
            </li>
          ))}
        </ul>

        <button onClick={irPrincipal} disabled={ocupado}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#f9b23b" }}>
          {ctaPrincipal.label}
        </button>
        {ctaSecundario && (
          <a href={ctaSecundario.href} target="_blank" rel="noopener noreferrer" onClick={() => { void marcarVisto(); }}
            className="block w-full text-center py-2.5 mt-1 text-sm font-semibold" style={{ color: "#93bf30" }}>
            {ctaSecundario.label}
          </a>
        )}
      </div>
    </div>
  );
}
