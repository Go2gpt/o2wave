"use client";

import { useState } from "react";
import { FormData, RedSocial, TipoOrganizacion, Tono, FormatoInstagram } from "@/lib/types";
import Logo from "./Logo";

interface GenerateFormProps {
  onGenerate: (formData: FormData) => void;
  isLoading: boolean;
}

const TIPOS: TipoOrganizacion[] = ["ONG", "Empresa"];
const TONOS: Tono[] = ["Motivador", "Informativo", "Cercano", "Urgente"];

const RED_OPTIONS: { value: RedSocial; label: string; emoji: string }[] = [
  { value: "Instagram", label: "Insta", emoji: "📸" },
  { value: "Facebook", label: "Face", emoji: "👥" },
  { value: "TikTok", label: "TikTok", emoji: "🎵" },
];

const FORMATO_OPTIONS: { value: FormatoInstagram; label: string }[] = [
  { value: "Post 1080×1080", label: "Post 1080×1080" },
  { value: "Story 9:16", label: "Story" },
];

export default function GenerateForm({ onGenerate, isLoading }: GenerateFormProps) {
  const [form, setForm] = useState<FormData>({
    nombreOrganizacion: "",
    tipoOrganizacion: "ONG",
    redSocial: "Instagram",
    formatoInstagram: "Post 1080×1080",
    entornoTikTok: "",
    tema: "",
    tono: "Cercano",
    incluirHashtags: true,
    incluirEmojis: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreOrganizacion.trim() || !form.tema.trim()) return;
    onGenerate(form);
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRedChange = (red: RedSocial) => {
    setField("redSocial", red);
    if (red === "Instagram" && !form.formatoInstagram) {
      setField("formatoInstagram", "Post 1080×1080");
    }
  };

  const pillActive = {
    borderColor: "#f9b23b",
    backgroundColor: "#fff8ef",
    color: "#f9b23b",
  };
  const pillInactive = {
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    color: "#6b7280",
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-12">
      {/* Hero */}
      <div
        className="rounded-3xl px-6 py-8 text-white text-center mb-6 mt-5"
        style={{ background: "linear-gradient(160deg, #0F0F0F 0%, #1c1c1c 100%)" }}
      >
        <div className="flex justify-center mb-3">
          <Logo size="lg" />
        </div>
        <h1 className="text-xl font-bold leading-snug mb-2">
          Genera contenido para redes sociales en segundos
        </h1>
        <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto mb-4">
          Diseñado para ONGs y PYMEs que quieren comunicar mejor, sin perder tiempo
        </p>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "rgba(147,191,48,0.15)", color: "#93bf30", border: "1px solid rgba(147,191,48,0.35)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#93bf30" }} />
          Potenciado por Claude AI
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
            Nombre de tu organización
          </label>
          <input
            type="text"
            value={form.nombreOrganizacion}
            onChange={(e) => setField("nombreOrganizacion", e.target.value)}
            placeholder="Ej: Fundación Futuro Verde"
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors"
            style={{ fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = "#f9b23b")}
            onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")}
            required
          />
        </div>

        {/* Tipo organización */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Tipo de organización
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {TIPOS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setField("tipoOrganizacion", tipo)}
                className="py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-150"
                style={form.tipoOrganizacion === tipo ? pillActive : pillInactive}
              >
                <span className="text-xl block mb-0.5">{tipo === "ONG" ? "🤝" : "🏢"}</span>
                <span className="block">{tipo}</span>
                <span className="block text-xs opacity-50 font-normal">
                  {tipo === "ONG" ? "Sin ánimo de lucro" : "Empresa / PYME"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Red social — pills compactas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Red social
          </label>
          <div className="flex gap-2 flex-wrap">
            {RED_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRedChange(value)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150"
                style={form.redSocial === value ? pillActive : pillInactive}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Formato Instagram — aparece condicionalmente */}
          {form.redSocial === "Instagram" && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Formato
              </p>
              <div className="flex gap-2">
                {FORMATO_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("formatoInstagram", value)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150"
                    style={form.formatoInstagram === value ? pillActive : pillInactive}
                  >
                    <span
                      className="inline-block rounded-sm"
                      style={{
                        width: value === "Post 1080×1080" ? "11px" : "8px",
                        height: value === "Post 1080×1080" ? "11px" : "14px",
                        backgroundColor: form.formatoInstagram === value ? "#f9b23b" : "#d1d5db",
                        flexShrink: 0,
                      }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entorno TikTok — aparece condicionalmente */}
          {form.redSocial === "TikTok" && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Describe tu entorno o ubicación
              </p>
              <textarea
                value={form.entornoTikTok || ""}
                onChange={(e) => setField("entornoTikTok", e.target.value)}
                placeholder="Ej: Oficina moderna, exterior urbano, sala de reuniones..."
                rows={2}
                className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors resize-none"
                style={{ fontFamily: "inherit" }}
                onFocus={(e) => (e.target.style.borderColor = "#f9b23b")}
                onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Se generará un script de video, no imagen
              </p>
            </div>
          )}
        </div>

        {/* Tema */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
            ¿Sobre qué quieres publicar?
          </label>
          <textarea
            value={form.tema}
            onChange={(e) => setField("tema", e.target.value)}
            placeholder="Describe el tema, campaña o mensaje que quieres comunicar..."
            rows={3}
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors resize-none"
            style={{ fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = "#f9b23b")}
            onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")}
            required
          />
        </div>

        {/* Tono — pills compactas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Tono del mensaje
          </label>
          <div className="flex gap-2 flex-wrap">
            {TONOS.map((tono) => (
              <button
                key={tono}
                type="button"
                onClick={() => setField("tono", tono)}
                className="px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150"
                style={form.tono === tono ? pillActive : pillInactive}
              >
                {tono}
              </button>
            ))}
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Opciones
          </label>
          <div className="space-y-3">
            {[
              { key: "incluirHashtags" as const, label: "Incluir hashtags", sub: "Añade hashtags relevantes" },
              { key: "incluirEmojis" as const, label: "Incluir emojis", sub: "Añade emojis al texto" },
            ].map(({ key, label, sub }) => (
              <button
                key={key}
                type="button"
                onClick={() => setField(key, !form[key])}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <div
                  className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                  style={{ backgroundColor: form[key] ? "#f9b23b" : "#e5e7eb" }}
                >
                  <div
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all duration-200"
                    style={{ left: form[key] ? "calc(100% - 22px)" : "2px" }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Botón generar */}
        <button
          type="submit"
          disabled={isLoading || !form.nombreOrganizacion.trim() || !form.tema.trim()}
          className="w-full py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
          style={{ backgroundColor: "#f9b23b", fontFamily: "inherit" }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2.5">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generando tu contenido...
            </span>
          ) : (
            "Generar contenido"
          )}
        </button>
      </form>
    </div>
  );
}
