"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import { pollForImage } from "@/lib/pollImage";
import { canUseFeature, puedeGenerarPostGratis, limitePostsMes, type PerfilGating } from "@/lib/plans";
import type { ContentFormData, TipoEntidad, RedSocial, FormatoInstagram, Tono } from "@/types";

const TONOS: Tono[] = ["Motivador", "Informativo", "Cercano", "Urgente"];
const RED_OPTIONS = [
  { value: "Instagram" as RedSocial, label: "Insta" },
  { value: "Facebook" as RedSocial, label: "Face" },
  { value: "TikTok" as RedSocial, label: "TikTok" },
  { value: "WhatsApp" as RedSocial, label: "WhatsApp" },
];

// Color de marca por red (texto/icono sin seleccionar; fondo al seleccionar).
const RED_COLOR: Record<string, string> = { Instagram: "#dc2743", Facebook: "#1877F2", TikTok: "#000000", WhatsApp: "#25D366" };
// Tinte ~8% (alpha 0x14) del color oficial para el fondo del estado seleccionado.
const RED_TINT: Record<string, string> = { Instagram: "#dc274314", Facebook: "#1877F214", TikTok: "#00000014", WhatsApp: "#25D36614" };

/** Icono SVG monocromo por red (fill=currentColor → hereda el color del botón). */
function IconoRed({ red }: { red: RedSocial }) {
  const p: Record<string, string> = {
    Instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z",
    Facebook: "M15.997 3.985h2.191V.169C17.81.117 16.51 0 14.996 0c-3.159 0-5.323 1.987-5.323 5.639V9H6.187v4.266h3.486V24h4.274V13.267h3.345l.531-4.266h-3.877V6.062c.001-1.233.333-2.077 2.101-2.077z",
    TikTok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    WhatsApp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={p[red]} />
    </svg>
  );
}
const FORMATO_OPTIONS = [
  { value: "Post 1080×1080" as FormatoInstagram, label: "Post" },
  { value: "Story 9:16" as FormatoInstagram, label: "Story" },
];
const DURACIONES_TIKTOK = [
  { value: "15s", label: "15s — gancho rápido" },
  { value: "30s", label: "30s — medio (recomendado)" },
  { value: "60s", label: "60s — desarrollado" },
];
const ENTORNOS_TIKTOK = [
  { value: "Casa", emoji: "🏠" },
  { value: "Calle", emoji: "🌆" },
  { value: "Oficina", emoji: "🏢" },
  { value: "Montaña", emoji: "🏔️" },
  { value: "Playa", emoji: "🏖️" },
  { value: "Naturaleza", emoji: "🌳" },
  { value: "Estudio", emoji: "🎬" },
];
const TONOS_TIKTOK = [
  { value: "Cercano", label: "Cercano — conversacional, como hablándole a un amigo" },
  { value: "Profesional", label: "Profesional — informativo, con autoridad" },
  { value: "Emotivo", label: "Emotivo — apelando a sentimientos" },
  { value: "Divertido", label: "Divertido — humor, ligereza" },
];

const pill = (active: boolean) => active
  ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
  : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" };

function CreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [form, setForm] = useState<ContentFormData>({
    nombreOrganizacion: "",
    tipoOrganizacion: "ong",
    redSocial: "Instagram",
    formatoInstagram: "Post 1080×1080",
    entornoTikTok: "",
    duracionTikTok: "30s",
    tonoTikTok: "Cercano",
    tema: "",
    tono: "Cercano",
    incluirHashtags: true,
    incluirEmojis: true,
  });
  const [entornoLibre, setEntornoLibre] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gating, setGating] = useState<PerfilGating | null>(null);
  const [showUpsell, setShowUpsell] = useState<string | null>(null); // red social bloqueada
  const [bloqueoMsg, setBloqueoMsg] = useState<string | null>(null);  // mensaje del servidor (402/429)
  const [genSegs, setGenSegs] = useState(0);   // segundos transcurridos durante la generación
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fotoPropia, setFotoPropia] = useState<File | null>(null);     // foto del usuario
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoError, setFotoError] = useState("");
  const [modoFoto, setModoFoto] = useState<"propia" | "integrada">("propia"); // cómo usar la foto
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("nombre_entidad, tipo_entidad, es_admin, plan_actual, plan_estado, posts_gratis_usados").eq("id", user.id).single();
      setGating({ plan_actual: profile?.plan_actual, plan_estado: profile?.plan_estado, es_admin: profile?.es_admin, posts_gratis_usados: profile?.posts_gratis_usados });
      // El tipo de la entidad viene del perfil (fuente única), no de un selector.
      setForm((f) => ({
        ...f,
        tipoOrganizacion: (profile?.tipo_entidad as TipoEntidad) || f.tipoOrganizacion,
        // Pre-rellena el nombre (editable) si está vacío.
        nombreOrganizacion: f.nombreOrganizacion || profile?.nombre_entidad || "",
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill del tema desde el calendario de días clave (?tema=...)
  useEffect(() => {
    const tema = searchParams.get("tema");
    if (tema) setForm((f) => ({ ...f, tema }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Límite de posts: fuente única de verdad = posts_gratis_usados (lo que el servidor
  // incrementa/resetea). limitePostsMes() devuelve Infinity para planes ilimitados/admin.
  const limitePosts = gating ? limitePostsMes(gating) : Infinity;
  const postsUsados = gating?.posts_gratis_usados ?? 0;
  const limiteAlcanzado = gating ? !puedeGenerarPostGratis(gating) : false;
  // "Integrar mi cara": solo planes de pago (no gratuito) o admin.
  const puedeIntegrar = !!gating && (gating.es_admin === true || (!!gating.plan_actual && gating.plan_actual !== "ong_pequena"));

  const set = <K extends keyof ContentFormData>(k: K, v: ContentFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Foto propia (opcional): si la sube, nos saltamos la generación IA.
  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFotoError("");
    const okMime = ["image/jpeg", "image/png", "image/heic", "image/heif"].includes(file.type);
    const okExt = /\.(jpe?g|png|heic|heif)$/i.test(file.name);
    if (!okMime && !okExt) { setFotoError("Usa una imagen JPG, PNG o HEIC."); return; }
    if (file.size > 8 * 1024 * 1024) { setFotoError("La foto supera el límite de 8 MB."); return; }
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPropia(file);
    setFotoPreview(URL.createObjectURL(file));
  };
  const quitarFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPropia(null); setFotoPreview(null); setFotoError(""); setModoFoto("propia");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreOrganizacion.trim() || !form.tema.trim()) return;
    if (limiteAlcanzado) return;
    setError("");
    setLoading(true);
    // Cronómetro: el usuario ve que la app sigue trabajando.
    setGenSegs(0);
    genTimer.current = setInterval(() => setGenSegs((s) => s + 1), 1000);

    try {
      // Imagen: TikTok no lleva. 3 modos:
      //  - foto + "integrada" (plan de pago) → Gemini integra la cara en la escena.
      //  - foto + "propia" → se usa tal cual (sin IA, ahorra coste).
      //  - sin foto → IA pura desde el prompt.
      const integrar = !!fotoPropia && modoFoto === "integrada" && puedeIntegrar;
      const modoImagen: "ia" | "propia" | "integrada" = integrar ? "integrada" : fotoPropia ? "propia" : "ia";
      const imageReq = (() => {
        if (form.redSocial === "TikTok") return Promise.resolve(null);
        if (integrar) {
          const fd = new FormData();
          fd.append("payload", JSON.stringify({ formData: form }));
          fd.append("foto", fotoPropia as File);
          return fetch("/api/generate-image", { method: "POST", body: fd });
        }
        if (fotoPropia) {
          const fd = new FormData();
          fd.append("foto", fotoPropia);
          return fetch("/api/upload-foto", { method: "POST", body: fd });
        }
        return fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formData: form }) });
      })();

      // Generate text and image in parallel
      const [textRes, imageRes] = await Promise.all([
        fetch("/api/generate-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }),
        imageReq,
      ]);

      const textData = await textRes.json();
      // Gating del servidor: plan suspendido (402), feature no disponible (403), límite gratis (429).
      if (!textRes.ok) {
        const codigosGating = ["plan_suspendido", "feature_no_disponible", "limite_gratis_alcanzado"];
        if (codigosGating.includes(textData?.error)) {
          setBloqueoMsg(textData.mensaje || "Esta función no está disponible en tu plan.");
          setLoading(false);
          return;
        }
        throw new Error(textData?.mensaje || textData?.error || "Error generando contenido");
      }
      if (textData.error) throw new Error(textData.error);

      // El endpoint de imagen ahora es SÍNCRONO (OpenAI): devuelve imagenUrl ya
      // subida (imagen limpia; el titular se hornea al descargar). Mantenemos el
      // polling como compatibilidad por si algún flujo devolviera predictionId.
      const imageData = imageRes ? await imageRes.json() : null;
      // Si el usuario subió foto y la subida/integración falló, avisamos (no guardamos sin imagen).
      if (fotoPropia && imageRes && !imageRes.ok) {
        throw new Error(imageData?.mensaje || imageData?.error || "No se pudo procesar tu foto. Inténtalo de nuevo.");
      }
      let imagenUrl: string | undefined;
      if (imageData?.imagenUrl) {
        imagenUrl = imageData.imagenUrl;
      } else if (imageData?.predictionId) {
        imagenUrl = (await pollForImage(imageData.predictionId)) ?? undefined;
      }

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const esTikTok = form.redSocial === "TikTok";
      const postData = {
        user_id: user?.id,
        red_social: form.redSocial,
        formato: esTikTok ? null : form.formatoInstagram,
        texto: textData.texto,
        imagen_url: imagenUrl,
        tema: form.tema,
        tono: esTikTok ? form.tonoTikTok : form.tono,
        tipo_entidad: form.tipoOrganizacion,
        nombre_entidad: form.nombreOrganizacion,
        guion_tiktok: esTikTok ? (textData.guion ?? null) : null,
      };

      const { data: saved } = await supabase.from("generated_posts").insert(postData).select().single();

      // modo_imagen (analítica): best-effort, no rompe si la columna no existe aún.
      if (saved?.id && !esTikTok && modoImagen !== "ia") {
        await supabase.from("generated_posts").update({ modo_imagen: modoImagen }).eq("id", saved.id).then(() => {}, () => {});
      }

      // Navigate to result; pasamos el titular sugerido por query (para el editor).
      const titular = textData.titular || form.tema;
      router.push(`/result?id=${saved?.id}&titular=${encodeURIComponent(titular)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generando contenido");
    } finally {
      if (genTimer.current) { clearInterval(genTimer.current); genTimer.current = null; }
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-5">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#f9b23b", borderTopColor: "transparent" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Generando con IA</h2>
      <p className="text-sm text-gray-400">Llevamos {genSegs}s · es normal que tarde un poco</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dashboard">Inicio</BackLink>
      </div>

      <div className="px-5 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Crear contenido</h1>
      </div>

      <form onSubmit={handleGenerate} className="px-5 space-y-4 pb-4">
        {/* Nombre */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {form.tipoOrganizacion === "empresa" ? "Nombre de tu empresa" : "Nombre de tu organización"}
          </label>
          <input value={form.nombreOrganizacion} onChange={e => set("nombreOrganizacion", e.target.value)}
            placeholder={form.tipoOrganizacion === "empresa" ? "Ej: Zapatos Rodríguez" : "Ej: Fundación Futuro Verde"} required
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = "#f9b23b"}
            onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
        </div>

        {/* Red social */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Red social</label>
          {/* Grid 2x2 en móvil (evita desborde con 'WhatsApp'), 4x1 en desktop. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RED_OPTIONS.map(({ value, label }) => {
              // Solo bloqueamos lo que el plan no incluye (p. ej. TikTok en ong_pequena).
              // Mientras carga el perfil (gating null) no bloqueamos nada (el server valida igualmente).
              const bloqueada = gating ? !canUseFeature(gating, value.toLowerCase()) : false;
              const sel = form.redSocial === value && !bloqueada;
              const estilo: React.CSSProperties = sel
                ? { background: RED_TINT[value], color: RED_COLOR[value], border: `2px solid ${RED_COLOR[value]}` }
                : { background: "#fff", color: "#6b7280", border: "2px solid #e5e7eb" };
              return (
                <button key={value} type="button"
                  onClick={() => bloqueada ? setShowUpsell(label) : set("redSocial", value)}
                  aria-disabled={bloqueada}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{ ...estilo, ...(bloqueada ? { opacity: 0.6 } : {}) }}>
                  <span style={{ color: RED_COLOR[value], display: "inline-flex" }}><IconoRed red={value} /></span>
                  <span>{label}</span>{bloqueada && <span>🔒</span>}
                </button>
              );
            })}
          </div>

          {form.redSocial === "Instagram" && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Formato</p>
              <div className="flex gap-2">
                {FORMATO_OPTIONS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => set("formatoInstagram", value)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                    style={pill(form.formatoInstagram === value)}>
                    <span className="inline-block rounded-sm"
                      style={{ width: value === "Post 1080×1080" ? "11px" : "8px", height: value === "Post 1080×1080" ? "11px" : "14px",
                        backgroundColor: form.formatoInstagram === value ? "#f9b23b" : "#d1d5db", flexShrink: 0 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.redSocial === "TikTok" && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Entorno o ubicación</p>
                <div className="flex flex-wrap gap-2">
                  {ENTORNOS_TIKTOK.map(({ value, emoji }) => (
                    <button key={value} type="button"
                      onClick={() => { setEntornoLibre(false); set("entornoTikTok", value); }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                      style={pill(!entornoLibre && form.entornoTikTok === value)}>
                      <span>{emoji}</span><span>{value}</span>
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { setEntornoLibre(true); set("entornoTikTok", ""); }}
                    className="px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                    style={pill(entornoLibre)}>
                    ✏️ Otro
                  </button>
                </div>
                {entornoLibre && (
                  <input value={form.entornoTikTok || ""} onChange={e => set("entornoTikTok", e.target.value)}
                    placeholder="Ej: cafetería, taller, mercado..."
                    className="mt-2 w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors"
                    onFocus={e => e.target.style.borderColor = "#f9b23b"}
                    onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Duración</p>
                <select value={form.duracionTikTok} onChange={e => set("duracionTikTok", e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors bg-white"
                  onFocus={e => e.target.style.borderColor = "#f9b23b"}
                  onBlur={e => e.target.style.borderColor = "#f3f4f6"}>
                  {DURACIONES_TIKTOK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tono</p>
                <div className="flex gap-2 flex-wrap">
                  {TONOS_TIKTOK.map(t => (
                    <button key={t.value} type="button" onClick={() => set("tonoTikTok", t.value)}
                      className="px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                      style={pill(form.tonoTikTok === t.value)}>
                      {t.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tema */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">¿Sobre qué publicar?</label>
          <textarea value={form.tema} onChange={e => set("tema", e.target.value)}
            rows={3} placeholder="Describe el tema o mensaje que quieres comunicar..." required
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none resize-none transition-colors"
            onFocus={e => e.target.style.borderColor = "#f9b23b"}
            onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
        </div>

        {/* Tu foto (opcional): si la sube, se salta la generación IA. No TikTok (genera guion). */}
        {form.redSocial !== "TikTok" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tu foto (opcional)</label>
            <p className="text-xs text-gray-400 mb-3">
              Si ya tienes una foto, súbela aquí y te ahorras la generación con IA. Si no, generamos una por ti. JPG, PNG o HEIC, máx. 8 MB.
            </p>
            {fotoPropia && fotoPreview ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Tu foto" className="w-20 h-20 rounded-xl object-cover border-2" style={{ borderColor: "#f9b23b" }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{fotoPropia.name}</p>
                  <button type="button" onClick={quitarFoto} className="text-sm font-bold" style={{ color: "#dc2743" }}>Quitar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fotoInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95"
                style={{ borderColor: "#f9b23b", color: "#f9b23b" }}>
                📷 Subir mi foto
              </button>
            )}
            {/* ¿Cómo usar la foto? (solo cuando hay foto subida) */}
            {fotoPropia && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">¿Cómo quieres usar tu foto?</p>
                <button type="button" onClick={() => setModoFoto("propia")}
                  className="w-full flex items-start gap-3 text-left p-3 rounded-xl border-2 transition-all"
                  style={modoFoto === "propia" ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef" } : { borderColor: "#e5e7eb" }}>
                  <span className="text-lg">🖼️</span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Usar mi foto tal cual</span>
                    <span className="block text-xs text-gray-400">Gratis e instantáneo, sin IA.</span>
                  </span>
                </button>
                <button type="button" disabled={!puedeIntegrar}
                  onClick={() => puedeIntegrar && setModoFoto("integrada")}
                  className="w-full flex items-start gap-3 text-left p-3 rounded-xl border-2 transition-all disabled:opacity-60"
                  style={modoFoto === "integrada" && puedeIntegrar ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef" } : { borderColor: "#e5e7eb" }}>
                  <span className="text-lg">🎨</span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">
                      Integrar mi cara en una escena IA {!puedeIntegrar && <span className="text-gray-400">🔒</span>}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {puedeIntegrar ? "La IA te coloca en la escena de tu tema (~10s)." : "Disponible en los planes de pago."}
                    </span>
                  </span>
                </button>
                {!puedeIntegrar && (
                  <Link href="/plans" className="inline-block text-xs font-bold" style={{ color: "#f9b23b" }}>Ver planes →</Link>
                )}
              </div>
            )}

            {fotoError && <p className="text-xs text-red-600 font-medium mt-2">⚠️ {fotoError}</p>}
            <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" onChange={elegirFoto} className="hidden" />
          </div>
        )}

        {/* Tono (genérico — TikTok usa su propio Tono en su bloque) */}
        {form.redSocial !== "TikTok" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tono</label>
          <div className="flex gap-2 flex-wrap">
            {TONOS.map(t => (
              <button key={t} type="button" onClick={() => set("tono", t)}
                className="px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                style={pill(form.tono === t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Opciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {(["incluirHashtags", "incluirEmojis"] as const).map(key => (
            <button key={key} type="button" onClick={() => set(key, !form[key])}
              className="w-full flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-700">
                  {key === "incluirHashtags" ? "Incluir hashtags" : "Incluir emojis"}
                </p>
                <p className="text-xs text-gray-400">
                  {key === "incluirHashtags" ? "Hashtags relevantes" : "Emojis expresivos"}
                </p>
              </div>
              <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ backgroundColor: form[key] ? "#f9b23b" : "#e5e7eb" }}>
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all"
                  style={{ left: form[key] ? "calc(100% - 22px)" : "2px" }} />
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl p-3 bg-red-50 border border-red-100">
            <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
          </div>
        )}

        {Number.isFinite(limitePosts) && (
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-gray-500">{postsUsados} de {limitePosts} posts este mes</span>
            {limiteAlcanzado && (
              <Link href="/plans" className="font-bold" style={{ color: "#f9b23b" }}>Mejora tu plan →</Link>
            )}
          </div>
        )}

        {limiteAlcanzado ? (
          <Link href="/plans"
            className="block w-full py-4 rounded-2xl font-bold text-white text-base text-center transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#0F0F0F" }}>
            🔒 Límite alcanzado · Mejora tu plan
          </Link>
        ) : (
          <button type="submit" disabled={!form.nombreOrganizacion.trim() || !form.tema.trim()}
            className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f9b23b" }}>
            Generar contenido
          </button>
        )}
      </form>

      {/* Modal upsell: red social bloqueada por plan */}
      {showUpsell && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4" onClick={() => setShowUpsell(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">🔒</div>
            <h3 className="font-bold text-gray-900 mb-1">{showUpsell} está en los planes de pago</h3>
            <p className="text-sm text-gray-500 mb-4">Mejora tu plan para desbloquear esta función ({showUpsell}).</p>
            <Link href="/plans" className="block w-full py-3 rounded-2xl font-bold text-white text-sm" style={{ backgroundColor: "#f9b23b" }}>Ver planes</Link>
            <button onClick={() => setShowUpsell(null)} className="w-full py-2.5 text-sm text-gray-500 font-medium">Ahora no</button>
          </div>
        </div>
      )}

      {/* Modal bloqueo del servidor: plan suspendido / límite gratis alcanzado */}
      {bloqueoMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4" onClick={() => setBloqueoMsg(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">✨</div>
            <h3 className="font-bold text-gray-900 mb-1">Mejora tu plan</h3>
            <p className="text-sm text-gray-500 mb-4">{bloqueoMsg}</p>
            <Link href="/plans" className="block w-full py-3 rounded-2xl font-bold text-white text-sm" style={{ backgroundColor: "#f9b23b" }}>Ver planes</Link>
            <button onClick={() => setBloqueoMsg(null)} className="w-full py-2.5 text-sm text-gray-500 font-medium">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner /></div>}>
      <CreateInner />
    </Suspense>
  );
}
