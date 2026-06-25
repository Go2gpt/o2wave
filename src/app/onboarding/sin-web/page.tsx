"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import ProgressBar from "@/components/ProgressBar";
import { createClient } from "@/lib/supabase";
import { normalizarMarca } from "@/lib/formatText";
import { irACheckoutODashboard, descartarPlanPendiente } from "@/lib/checkoutRedirect";
import { grupoCuenta, COPY_SIN_WEB, type GrupoCuenta } from "@/lib/copys-por-tipo";

interface Analysis {
  nombre?: string | null;
  sector?: string | null;
  mision_valores?: string | null;
  publico_objetivo?: string | null;
  servicios_programas?: string | null;
  causas_o_productos?: string | null;
  temas_prioritarios?: string[] | null;
  tipo_publicaciones?: string | null;
  tono?: string | null; // solo preview, no se persiste
  idioma_principal?: string | null;
  hashtags_sugeridos?: string[] | null;
  geografia?: string | null;
  estilo_visual?: string | null;
  logros_numeros?: string | null;
}

const inputCls = "w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors resize-none";
const onF = (e: React.FocusEvent<HTMLTextAreaElement>) => (e.target.style.borderColor = "#f9b23b");
const onB = (e: React.FocusEvent<HTMLTextAreaElement>) => (e.target.style.borderColor = "#f3f4f6");

const LOADING_MSGS = [
  "Leyendo tu propósito…",
  "Detectando tu tono…",
  "Identificando a quién te diriges…",
  "Casi listo…",
];

export default function OnboardingSinWebPage() {
  const router = useRouter();
  const supabase = createClient();

  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [frase, setFrase] = useState("");
  const [posts, setPosts] = useState("");
  const [bio, setBio] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [hayPlanPendiente, setHayPlanPendiente] = useState(false);
  const [grupo, setGrupo] = useState<GrupoCuenta>("ong");

  // ¿El usuario venía de /plans con un plan de pago? → mostrar opt-out en el paso 4.
  useEffect(() => {
    try { setHayPlanPendiente(!!localStorage.getItem("plan_pendiente_checkout")); } catch { /* noop */ }
  }, []);

  // Tipo de cuenta (ong/empresa/particular) para adaptar los textos del wizard.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("tipo_entidad").eq("id", user.id).single();
      setGrupo(grupoCuenta(data?.tipo_entidad));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotación de mensajes durante el análisis (cubre el tiempo real del POST,
  // sin temporizadores que adelanten o atrasen el cambio de pantalla).
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (analyzing) {
      setMsgIdx(0);
      msgTimer.current = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 2200);
    } else if (msgTimer.current) {
      clearInterval(msgTimer.current);
      msgTimer.current = null;
    }
    return () => { if (msgTimer.current) clearInterval(msgTimer.current); };
  }, [analyzing]);

  const analizar = async () => {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fraseDescriptiva: frase, posts: posts || undefined, bio: bio || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al analizar");
      setAnalysis(data.analysis || {});
      setPaso(4);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar. Inténtalo de nuevo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const guardarPerfil = async (a: Analysis): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return false; }

    // No pisar el nombre con null si la IA no lo detectó.
    const { data: actual } = await supabase.from("profiles").select("nombre_entidad").eq("id", user.id).single();
    const nombre = a.nombre ? normalizarMarca(a.nombre) : (actual?.nombre_entidad ?? null);

    const { error: updErr } = await supabase.from("profiles").update({
      nombre_entidad: nombre,
      sector: a.sector ?? null,
      web_url: "",
      mision_valores: a.mision_valores || null,
      publico_objetivo: a.publico_objetivo || null,
      servicios_programas: a.servicios_programas || null,
      causas_o_productos: a.causas_o_productos || null,
      colores_marca: [],
      idioma_principal: a.idioma_principal || null,
      hashtags_sugeridos: Array.isArray(a.hashtags_sugeridos) ? a.hashtags_sugeridos : [],
      geografia: a.geografia || null,
      estilo_visual: a.estilo_visual || null,
      logros_numeros: a.logros_numeros || null,
      temas_prioritarios: Array.isArray(a.temas_prioritarios) ? a.temas_prioritarios : [],
      tipo_publicaciones: a.tipo_publicaciones || null,
      info_extra: null,
      onboarding_complete: true,
    }).eq("id", user.id);

    if (updErr) { console.error("onboarding sin-web save error:", updErr); return false; }
    return true;
  };

  const estaPerfecto = async () => {
    if (!analysis) return;
    setSaving(true);
    const ok = await guardarPerfil(analysis);
    if (!ok) { setSaving(false); setError("No se pudo guardar tu perfil. Inténtalo de nuevo."); return; }
    // Si venía de /plans con un plan de pago, retoma el checkout; si no, al dashboard.
    await irACheckoutODashboard(router);
  };

  const empezarGratis = async () => {
    if (!analysis) return;
    setSaving(true);
    const ok = await guardarPerfil(analysis);
    if (!ok) { setSaving(false); setError("No se pudo guardar tu perfil. Inténtalo de nuevo."); return; }
    descartarPlanPendiente(); // renuncia al plan de pago elegido en /plans
    router.push("/dashboard");
  };

  const ajustarDetalles = () => {
    // Reutiliza el formulario manual: deja la extracción en onb_data (mismo
    // formato que analyze-web) para que /onboarding/identity la prerellene.
    sessionStorage.setItem("onb_data", JSON.stringify({ suficiente: true, analysis }));
    sessionStorage.setItem("web_url", "");
    router.push("/onboarding/identity");
  };

  // ---- Pantalla de análisis (cubre el tiempo real del POST) ----
  if (analyzing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-5">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#f9b23b", borderTopColor: "transparent" }} />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{LOADING_MSGS[msgIdx]}</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">La IA está creando tu perfil de comunicación.</p>
      </div>
    );
  }

  const headerEtiqueta = paso === 4 ? "Listo" : `Paso ${paso} de 4`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <Logo size="md" />
        <div className="mt-4"><ProgressBar pasos={4} actual={paso} etiqueta={headerEtiqueta} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8">
        {error && (
          <div className="rounded-xl p-3 bg-red-50 border border-red-100 mb-4">
            <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* PASO 1 */}
        {paso === 1 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Empezamos por lo básico</h1>
              <p className="text-sm font-semibold" style={{ color: "#f9b23b" }}>{COPY_SIN_WEB.paso1Sub[grupo]}</p>
            </div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{COPY_SIN_WEB.paso1Label[grupo]}</label>
            <textarea value={frase} onChange={(e) => setFrase(e.target.value)} rows={3}
              placeholder={COPY_SIN_WEB.paso1Placeholder[grupo]}
              className={inputCls} onFocus={onF} onBlur={onB} />
            <button onClick={() => { setPaso(2); window.scrollTo(0, 0); }} disabled={frase.trim().length < 4}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>Siguiente →</button>
          </>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Tu voz real</h1>
              <p className="text-sm font-semibold" style={{ color: "#f9b23b" }}>Cuanto más nos cuentes ahora, menos tendrás que editar después.</p>
            </div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{grupo === "empresa"
              ? "Pega aquí 2-3 posts recientes de tus redes sociales (LinkedIn, Instagram, Facebook…)"
              : "Pega aquí 2-3 posts recientes de tus redes (Instagram, Facebook, LinkedIn…)"}</label>
            <p className="text-xs text-gray-400 mb-2">{grupo === "empresa"
              ? "Copia el texto de tus mejores posts. Sin imágenes ni hashtags."
              : "Copia el texto de tus mejores posts. Sin imágenes ni hashtags, solo el texto. La IA aprenderá tu tono."}</p>
            <textarea value={posts} onChange={(e) => setPosts(e.target.value)} rows={9}
              placeholder="Pega aquí el texto de tus posts…" className={inputCls} onFocus={onF} onBlur={onB} />
            <button onClick={() => { setPaso(3); window.scrollTo(0, 0); }}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>Siguiente →</button>
            <button onClick={() => { setPaso(3); window.scrollTo(0, 0); }} className="w-full mt-3 py-2 text-sm text-gray-400 font-medium">No tengo posts, saltar</button>
          </>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Tu identidad pública</h1>
              <p className="text-sm font-semibold" style={{ color: "#f9b23b" }}>Un último empujón. Promesa: tu app aprenderá tu voz, no será una IA genérica.</p>
            </div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{COPY_SIN_WEB.paso3Label[grupo]}</label>
            <p className="text-xs text-gray-400 mb-2">{COPY_SIN_WEB.paso3Sub[grupo]}</p>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5}
              placeholder="Pega aquí tu bio…" className={inputCls} onFocus={onF} onBlur={onB} />
            <button onClick={analizar}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>Analizar y terminar ✨</button>
            <button onClick={analizar} className="w-full mt-3 py-2 text-sm text-gray-400 font-medium">No tengo, terminar igual</button>
          </>
        )}

        {/* PASO 4 — preview */}
        {paso === 4 && analysis && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Tu IA ya te conoce 🎉</h1>
              <p className="text-sm font-semibold" style={{ color: "#f9b23b" }}>Esto es lo que hemos aprendido de ti. La IA usará todo esto cada vez que generes contenido.</p>
            </div>

            <div className="space-y-3">
              {analysis.mision_valores && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-800 mb-1">{COPY_SIN_WEB.paso4Actividad[grupo]}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.mision_valores}</p>
                </div>
              )}
              {analysis.publico_objetivo && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-800 mb-1">👥 A quién te diriges</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.publico_objetivo}</p>
                </div>
              )}
              {analysis.tono && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-800 mb-1">🗣️ Tu tono</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.tono}</p>
                </div>
              )}
              {Array.isArray(analysis.hashtags_sugeridos) && analysis.hashtags_sugeridos.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-800 mb-2">#️⃣ Hashtags que te identifican</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.hashtags_sugeridos.map((h) => (
                      <span key={h} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.geografia && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-800 mb-1">🌍 Ámbito y geografía</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.geografia}</p>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-6">
              <button onClick={estaPerfecto} disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#f9b23b" }}>
                {saving ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando…</span> : "Está perfecto, empezar a crear contenido"}
              </button>
              <button onClick={ajustarDetalles} disabled={saving} className="w-full py-3 text-sm text-gray-400 font-medium">Quiero ajustar algún detalle</button>
              {hayPlanPendiente && (
                <button onClick={empezarGratis} disabled={saving} className="w-full py-2 text-xs text-gray-400 font-medium underline">
                  Prefiero empezar gratis por ahora
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
