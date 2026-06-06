"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import { pollForImage } from "@/lib/pollImage";
import { getPermisos, contarPostsMes, type Permisos } from "@/lib/permissions";
import type { ContentFormData, TipoEntidad, RedSocial, FormatoInstagram, Tono } from "@/types";

const TONOS: Tono[] = ["Motivador", "Informativo", "Cercano", "Urgente"];
const RED_OPTIONS = [
  { value: "Instagram" as RedSocial, label: "Insta", emoji: "📸" },
  { value: "Facebook" as RedSocial, label: "Face", emoji: "👥" },
  { value: "TikTok" as RedSocial, label: "TikTok", emoji: "🎵" },
];
const FORMATO_OPTIONS = [
  { value: "Post 1080×1080" as FormatoInstagram, label: "Post" },
  { value: "Story 9:16" as FormatoInstagram, label: "Story" },
];
const TIPOS = [
  { value: "ong" as TipoEntidad, label: "ONG", emoji: "🤝" },
  { value: "pyme" as TipoEntidad, label: "PYME", emoji: "🏢" },
  { value: "autonomo" as TipoEntidad, label: "Autónomo", emoji: "💼" },
];
const DURACIONES_TIKTOK = [
  { value: "15s", label: "15s — gancho rápido" },
  { value: "30s", label: "30s — medio (recomendado)" },
  { value: "60s", label: "60s — desarrollado" },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [permisos, setPermisos] = useState<Permisos | null>(null);
  const [postsMes, setPostsMes] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("tipo_entidad, es_admin").eq("id", user.id).single();
      setPermisos(getPermisos(profile?.tipo_entidad, profile?.es_admin));
      setPostsMes(await contarPostsMes(supabase, user.id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill del tema desde el calendario de días clave (?tema=...)
  useEffect(() => {
    const tema = searchParams.get("tema");
    if (tema) setForm((f) => ({ ...f, tema }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const limiteAlcanzado = !!permisos?.postsMaxMes && postsMes >= permisos.postsMaxMes;

  const set = <K extends keyof ContentFormData>(k: K, v: ContentFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreOrganizacion.trim() || !form.tema.trim()) return;
    if (limiteAlcanzado) return;
    setError("");
    setLoading(true);

    try {
      // Generate text and image in parallel
      const [textRes, imageRes] = await Promise.all([
        fetch("/api/generate-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }),
        form.redSocial !== "TikTok"
          ? fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formData: form }) })
          : Promise.resolve(null),
      ]);

      const textData = await textRes.json();
      if (textData.error) throw new Error(textData.error);

      // El endpoint de imagen devuelve un predictionId; al terminar, el servidor
      // estampa el titular (textData.titular) y sube la imagen final.
      const imageData = imageRes ? await imageRes.json() : null;
      let imagenUrl: string | undefined;
      if (imageData?.predictionId) {
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

      // Navigate to result; pasamos el titular sugerido por query (para el editor).
      const titular = textData.titular || form.tema;
      router.push(`/result?id=${saved?.id}&titular=${encodeURIComponent(titular)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generando contenido");
    } finally {
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
      <h2 className="text-lg font-bold text-gray-900 mb-2">Generando tu contenido...</h2>
      <p className="text-sm text-gray-400">Claude AI está trabajando para ti</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-xs font-semibold text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200">
          ✨ Claude AI
        </span>
      </div>

      <div className="px-5 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Crear contenido</h1>
      </div>

      <form onSubmit={handleGenerate} className="px-5 space-y-4 pb-4">
        {/* Nombre */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Nombre de tu organización
          </label>
          <input value={form.nombreOrganizacion} onChange={e => set("nombreOrganizacion", e.target.value)}
            placeholder="Ej: Fundación Futuro Verde" required
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = "#f9b23b"}
            onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
        </div>

        {/* Tipo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tipo</label>
          <div className="flex gap-2">
            {TIPOS.map(({ value, label, emoji }) => (
              <button key={value} type="button" onClick={() => set("tipoOrganizacion", value)}
                className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all"
                style={pill(form.tipoOrganizacion === value)}>
                <span className="block text-lg mb-0.5">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Red social */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Red social</label>
          <div className="flex gap-2">
            {RED_OPTIONS
              .filter(o => !permisos || (permisos.redesSociales as readonly string[]).includes(o.value))
              .map(({ value, label, emoji }) => (
                <button key={value} type="button" onClick={() => set("redSocial", value)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                  style={pill(form.redSocial === value)}>
                  <span>{emoji}</span><span>{label}</span>
                </button>
              ))}
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
                <textarea value={form.entornoTikTok || ""} onChange={e => set("entornoTikTok", e.target.value)}
                  rows={2} placeholder="Ej: Oficina moderna, exterior urbano..."
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none resize-none transition-colors"
                  onFocus={e => e.target.style.borderColor = "#f9b23b"}
                  onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
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
                <select value={form.tonoTikTok} onChange={e => set("tonoTikTok", e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors bg-white"
                  onFocus={e => e.target.style.borderColor = "#f9b23b"}
                  onBlur={e => e.target.style.borderColor = "#f3f4f6"}>
                  {TONOS_TIKTOK.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
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

        {permisos?.postsMaxMes != null && (
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-gray-500">{postsMes} de {permisos.postsMaxMes} posts este mes</span>
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
