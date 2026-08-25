"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tour de bienvenida (primera vez). Diapositivas con "Saltar" y navegación. Se
 * muestra una vez por dispositivo vía localStorage (sin migración). Empieza por
 * la recomendación de completar el perfil y cubre crear post, pack semanal y
 * publicar. Coordinado con NovedadesPopup: ese no aparece hasta que el tour se
 * cierra (evita dos overlays a la vez).
 */
const SLIDES = [
  { icon: "👋", titulo: "Bienvenido/a a o2Wave", texto: "Tu community manager con IA. Te enseño lo básico en 30 segundos — puedes saltarlo cuando quieras." },
  { icon: "📝", titulo: "Rellena tu perfil", texto: "Empieza por aquí: cuanta más información pongas (tu entidad, sector, redes activas y proyectos), más preciso y tuyo será el contenido que genere o2Wave." },
  { icon: "✨", titulo: "Crea un post", texto: "En «Crear» eliges red, tema y tono. Puedes escoger la imagen: una foto con IA o un banner de marca. Obtienes texto e imagen listos para publicar." },
  { icon: "🗓️", titulo: "Tu pack semanal", texto: "Cada semana o2Wave te prepara un plan de varios posts, mezclando redes y estilos. Puedes generarlo cuando quieras y editar cada día antes de publicar." },
  { icon: "📤", titulo: "Publica en tus redes", texto: "Al pulsar «Publicar», el texto se copia solo al portapapeles. Elige tu red, pega el texto (mantén pulsado → Pegar) y la imagen va contigo. ¡Así de fácil!" },
  { icon: "🚀", titulo: "¡Empecemos!", texto: "Lo primero: completa tu perfil para que todo salga a tu medida." },
];

export default function OnboardingTour() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try { if (!localStorage.getItem("onboarding_visto")) setVisible(true); } catch { /* sin localStorage */ }
  }, []);

  const cerrar = () => {
    try { localStorage.setItem("onboarding_visto", "1"); } catch { /* sin localStorage */ }
    setVisible(false);
  };
  const irPerfil = () => { cerrar(); router.push("/perfil"); };

  // Cuando el tour no está abierto, dejamos un botón flotante "?" para reabrirlo
  // (por si el usuario lo saltó y luego lo necesita). Visible en todas las pantallas.
  if (!visible) {
    return (
      <button onClick={() => { setI(0); setVisible(true); }} aria-label="Ver tutorial"
        className="fixed z-40 rounded-full bg-white flex items-center justify-center font-black transition-all active:scale-95"
        style={{ bottom: "5.25rem", right: "1rem", width: 42, height: 42, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", color: "#f9b23b", fontSize: 20 }}>
        ?
      </button>
    );
  }
  const s = SLIDES[i];
  const ultimo = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 relative">
        <button onClick={cerrar} className="absolute top-3 right-4 text-xs font-bold text-gray-400 hover:text-gray-600">Saltar</button>

        <div className="pt-6 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">{s.icon}</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">{s.titulo}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{s.texto}</p>
        </div>

        <div className="flex justify-center gap-1.5 my-5">
          {SLIDES.map((_, k) => (
            <span key={k} className="rounded-full transition-all" style={{ width: k === i ? 20 : 7, height: 7, backgroundColor: k === i ? "#f9b23b" : "#e5e7eb" }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="px-4 py-3 rounded-2xl border-2 text-sm font-bold text-gray-500" style={{ borderColor: "#e5e7eb" }}>‹ Atrás</button>
          )}
          <button onClick={ultimo ? irPerfil : () => setI(i + 1)}
            className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f9b23b" }}>
            {ultimo ? "Ir a mi perfil" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
