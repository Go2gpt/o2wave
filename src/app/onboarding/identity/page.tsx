"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import { normalizarMarca } from "@/lib/formatText";
import { irACheckoutODashboard, descartarPlanPendiente } from "@/lib/checkoutRedirect";

interface Analysis {
  nombre?: string | null;
  tipo?: string | null;
  sector?: string | null;
  mision_valores?: string | null;
  publico_objetivo?: string | null;
  servicios_programas?: string | null;
  causas_o_productos?: string | null;
  colores_marca?: string[] | null;
  idioma_principal?: string | null;
  hashtags_sugeridos?: string[] | null;
  geografia?: string | null;
  estilo_visual?: string | null;
  logros_numeros?: string | null;
}

const TIPOS_PUBLICACION = [
  "Informativas",
  "Emotivas",
  "Llamada a la acción",
  "Motivacionales",
  "Una mezcla de varias",
];

const inputCls =
  "w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors";
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = "#f9b23b");
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = "#f3f4f6");

function arrToText(a?: string[] | null): string {
  return Array.isArray(a) ? a.join(", ") : "";
}
function textToArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

// Definido a nivel de módulo: si estuviera dentro del componente, React lo
// recrearía en cada render y los inputs perderían el foco al escribir.
function Campo({ label, value, set, area = false }: {
  label: string; value: string; set: (v: string) => void; area?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      {area ? (
        <textarea value={value} onChange={(e) => set(e.target.value)} rows={3}
          className={`${inputCls} resize-none`} onFocus={onFocus} onBlur={onBlur} />
      ) : (
        <input value={value} onChange={(e) => set(e.target.value)} className={inputCls} onFocus={onFocus} onBlur={onBlur} />
      )}
    </div>
  );
}

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [paso, setPaso] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [suficiente, setSuficiente] = useState(true);
  const [hayPlanPendiente, setHayPlanPendiente] = useState(false);
  const gratisRef = useRef(false); // true → opt-out "empezar gratis", se salta el checkout

  // ¿El usuario venía de /plans con un plan de pago? → mostrar opt-out al finalizar.
  useEffect(() => {
    try { setHayPlanPendiente(!!localStorage.getItem("plan_pendiente_checkout")); } catch { /* noop */ }
  }, []);

  // Campos editables (paso 1)
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("");
  const [misionValores, setMisionValores] = useState("");
  const [publicoObjetivo, setPublicoObjetivo] = useState("");
  const [serviciosProgramas, setServiciosProgramas] = useState("");
  const [causasOProductos, setCausasOProductos] = useState("");
  const [coloresMarca, setColoresMarca] = useState("");
  const [idiomaPrincipal, setIdiomaPrincipal] = useState("");
  const [hashtagsSugeridos, setHashtagsSugeridos] = useState("");
  const [geografia, setGeografia] = useState("");
  const [estiloVisual, setEstiloVisual] = useState("");
  const [logrosNumeros, setLogrosNumeros] = useState("");

  // Preguntas finales (paso 2)
  const [tema1, setTema1] = useState("");
  const [tema2, setTema2] = useState("");
  const [tema3, setTema3] = useState("");
  const [tipoPublicaciones, setTipoPublicaciones] = useState("");
  const [infoExtra, setInfoExtra] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("onb_data");
    if (!stored) { router.push("/onboarding/web"); return; }
    const payload: { suficiente: boolean; analysis?: Analysis } = JSON.parse(stored);
    setSuficiente(payload.suficiente);
    const a = payload.analysis || {};
    setNombre(a.nombre || "");
    setSector(a.sector || "");
    setMisionValores(a.mision_valores || "");
    setPublicoObjetivo(a.publico_objetivo || "");
    setServiciosProgramas(a.servicios_programas || "");
    setCausasOProductos(a.causas_o_productos || "");
    setColoresMarca(arrToText(a.colores_marca));
    setIdiomaPrincipal(a.idioma_principal || "");
    setHashtagsSugeridos(arrToText(a.hashtags_sugeridos));
    setGeografia(a.geografia || "");
    setEstiloVisual(a.estilo_visual || "");
    setLogrosNumeros(a.logros_numeros || "");
    setLoaded(true);
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const webUrl = sessionStorage.getItem("web_url") || "";
      const temas = [tema1, tema2, tema3].map((t) => t.trim()).filter(Boolean);

      const { error } = await supabase.from("profiles").update({
        nombre_entidad: normalizarMarca(nombre),
        sector,
        web_url: webUrl,
        mision_valores: misionValores || null,
        publico_objetivo: publicoObjetivo || null,
        servicios_programas: serviciosProgramas || null,
        causas_o_productos: causasOProductos || null,
        colores_marca: textToArr(coloresMarca),
        idioma_principal: idiomaPrincipal || null,
        hashtags_sugeridos: textToArr(hashtagsSugeridos),
        geografia: geografia || null,
        estilo_visual: estiloVisual || null,
        logros_numeros: logrosNumeros || null,
        temas_prioritarios: temas,
        tipo_publicaciones: tipoPublicaciones || null,
        info_extra: infoExtra || null,
        onboarding_complete: true,
      }).eq("id", user.id);

      if (error) { console.error("onboarding save error:", error); setSaving(false); return; }

      sessionStorage.removeItem("onb_data");
      sessionStorage.removeItem("web_url");
      // Si venía de /plans con un plan de pago, retoma el checkout; si no, al dashboard.
      if (gratisRef.current) { descartarPlanPendiente(); router.push("/dashboard"); }
      else await irACheckoutODashboard(router);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <Logo size="md" />
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: "24px", backgroundColor: "#f9b23b" }} />
            ))}
          </div>
          <span className="text-xs text-gray-400">2 de 2</span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-4 overflow-y-auto">
        {paso === 1 ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {suficiente ? "Esto es lo que hemos detectado" : "Cuéntanos sobre tu organización"}
              </h1>
              <p className="text-sm text-gray-500">
                {suficiente
                  ? "Revisa y edita lo que haga falta antes de continuar."
                  : "No hemos podido analizar tu web a fondo. Rellena estos datos a mano."}
              </p>
            </div>

            <Campo label="Nombre de la entidad" value={nombre} set={setNombre} />
            <Campo label="Sector" value={sector} set={setSector} />
            <Campo label="Misión y valores" value={misionValores} set={setMisionValores} area />
            <Campo label="Público objetivo" value={publicoObjetivo} set={setPublicoObjetivo} area />
            <Campo label="Servicios o programas" value={serviciosProgramas} set={setServiciosProgramas} area />
            <Campo label="Causas o productos" value={causasOProductos} set={setCausasOProductos} area />
            <Campo label="Colores de marca (hex, separados por comas)" value={coloresMarca} set={setColoresMarca} />
            <Campo label="Idioma principal" value={idiomaPrincipal} set={setIdiomaPrincipal} />
            <Campo label="Hashtags sugeridos (separados por comas)" value={hashtagsSugeridos} set={setHashtagsSugeridos} />
            <Campo label="Geografía / ámbito" value={geografia} set={setGeografia} />
            <Campo label="Estilo visual" value={estiloVisual} set={setEstiloVisual} />
            <Campo label="Logros y números clave" value={logrosNumeros} set={setLogrosNumeros} area />

            <button onClick={() => { setPaso(2); window.scrollTo(0, 0); }}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              Todo correcto, continuar →
            </button>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Unas últimas preguntas</h1>
              <p className="text-sm text-gray-500">Nos ayudan a afinar tu contenido.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Los 3 temas que más quieres comunicar este año
              </label>
              <div className="space-y-2">
                <input value={tema1} onChange={(e) => setTema1(e.target.value)} placeholder="Tema 1" className={inputCls} onFocus={onFocus} onBlur={onBlur} />
                <input value={tema2} onChange={(e) => setTema2(e.target.value)} placeholder="Tema 2" className={inputCls} onFocus={onFocus} onBlur={onBlur} />
                <input value={tema3} onChange={(e) => setTema3(e.target.value)} placeholder="Tema 3" className={inputCls} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                ¿Qué publicaciones funcionan mejor con tu audiencia?
              </label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_PUBLICACION.map((t) => (
                  <button key={t} type="button" onClick={() => setTipoPublicaciones(t)}
                    className="px-3 py-2 rounded-full border-2 text-xs font-semibold transition-all"
                    style={tipoPublicaciones === t
                      ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                      : { borderColor: "#e5e7eb", color: "#6b7280" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                ¿Algo importante que NO aparezca en tu web? (opcional)
              </label>
              <textarea value={infoExtra} onChange={(e) => setInfoExtra(e.target.value)} rows={3}
                placeholder="Cuéntanoslo aquí..." className={`${inputCls} resize-none`} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div className="space-y-2">
              <button onClick={handleSave} disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#f9b23b" }}>
                {saving ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando...</span> : "Finalizar y entrar →"}
              </button>
              <button onClick={() => { setPaso(1); window.scrollTo(0, 0); }} disabled={saving}
                className="w-full py-3 text-sm text-gray-400 font-medium">
                ← Volver a los datos
              </button>
              {hayPlanPendiente && (
                <button onClick={() => { gratisRef.current = true; handleSave(); }} disabled={saving}
                  className="w-full py-2 text-xs text-gray-400 font-medium underline">
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
