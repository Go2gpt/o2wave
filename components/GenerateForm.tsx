"use client";

import { useState } from "react";
import { FormData, RedSocial, TipoOrganizacion, Tono, FormatoInstagram } from "@/lib/types";
import Logo from "./Logo";

interface GenerateFormProps {
  onGenerate: (formData: FormData) => void;
  isLoading: boolean;
}

const REDES: RedSocial[] = ["Instagram", "Facebook", "TikTok"];
const TIPOS: TipoOrganizacion[] = ["ONG", "Empresa"];
const TONOS: Tono[] = ["Profesional", "Cercano", "Inspirador", "Urgente"];
const FORMATOS: FormatoInstagram[] = ["Post 1080×1080", "Story 9:16"];

const TONO_DESCRIPCION: Record<Tono, string> = {
  Profesional: "Formal y técnico",
  Cercano: "Amigable y humano",
  Inspirador: "Motivador y emotivo",
  Urgente: "Llamada a la acción",
};

const RED_ICONS: Record<RedSocial, string> = {
  Instagram: "📸",
  Facebook: "👥",
  TikTok: "🎵",
};

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

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12">
      {/* Hero section */}
      <div
        className="rounded-3xl p-8 text-white text-center mb-8 mt-6"
        style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%)" }}
      >
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-bold leading-tight mb-3">
          Genera contenido para redes sociales en segundos
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto mb-4">
          Diseñado para ONGs y PYMEs que quieren comunicar mejor, sin perder tiempo
        </p>
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full"
          style={{ backgroundColor: "rgba(147,191,48,0.2)", color: "#93bf30", border: "1px solid rgba(147,191,48,0.4)" }}
        >
          <span className="w-2 h-2 rounded-full bg-verde animate-pulse" style={{ backgroundColor: "#93bf30" }} />
          Potenciado por Claude AI
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nombre organización */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Nombre de tu organización
          </label>
          <input
            type="text"
            value={form.nombreOrganizacion}
            onChange={(e) => setField("nombreOrganizacion", e.target.value)}
            placeholder="Ej: Fundación Futuro Verde"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-naranja transition-colors"
            style={{ fontFamily: "Montserrat, sans-serif" }}
            required
          />
        </div>

        {/* Tipo de organización */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Tipo de organización
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TIPOS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setField("tipoOrganizacion", tipo)}
                className="p-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200"
                style={
                  form.tipoOrganizacion === tipo
                    ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#374151" }
                }
              >
                <div className="text-2xl mb-1">{tipo === "ONG" ? "🤝" : "🏢"}</div>
                <div>{tipo}</div>
                <div className="text-xs opacity-60 font-normal mt-0.5">
                  {tipo === "ONG" ? "Sin ánimo de lucro" : "Empresa / PYME"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Red social */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Red social
          </label>
          <div className="grid grid-cols-3 gap-3">
            {REDES.map((red) => (
              <button
                key={red}
                type="button"
                onClick={() => setField("redSocial", red)}
                className="p-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 text-center"
                style={
                  form.redSocial === red
                    ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#374151" }
                }
              >
                <div className="text-2xl mb-1">{RED_ICONS[red]}</div>
                <div>{red}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Formato Instagram (condicional) */}
        {form.redSocial === "Instagram" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Formato
            </label>
            <div className="grid grid-cols-2 gap-3">
              {FORMATOS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setField("formatoInstagram", fmt)}
                  className="p-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 text-center"
                  style={
                    form.formatoInstagram === fmt
                      ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#374151" }
                  }
                >
                  <div
                    className="mx-auto mb-2 rounded"
                    style={{
                      width: fmt === "Post 1080×1080" ? "36px" : "24px",
                      height: fmt === "Post 1080×1080" ? "36px" : "42px",
                      backgroundColor: form.formatoInstagram === fmt ? "#f9b23b" : "#d1d5db",
                      borderRadius: "4px",
                    }}
                  />
                  <div className="font-semibold">{fmt === "Post 1080×1080" ? "Post" : "Story"}</div>
                  <div className="text-xs opacity-60 mt-0.5">{fmt}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Entorno TikTok (condicional) */}
        {form.redSocial === "TikTok" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Describe tu entorno o ubicación
            </label>
            <input
              type="text"
              value={form.entornoTikTok || ""}
              onChange={(e) => setField("entornoTikTok", e.target.value)}
              placeholder="Ej: Oficina moderna, exterior urbano, sala de reuniones..."
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-naranja transition-colors"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            />
            <p className="text-xs text-gray-400 mt-2">
              Para TikTok se generará un script de video en lugar de imagen
            </p>
          </div>
        )}

        {/* Tema */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            ¿Sobre qué quieres publicar?
          </label>
          <textarea
            value={form.tema}
            onChange={(e) => setField("tema", e.target.value)}
            placeholder="Describe el tema, campaña o mensaje que quieres comunicar..."
            rows={3}
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-naranja transition-colors resize-none"
            style={{ fontFamily: "Montserrat, sans-serif" }}
            required
          />
        </div>

        {/* Tono */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Tono del mensaje
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TONOS.map((tono) => (
              <button
                key={tono}
                type="button"
                onClick={() => setField("tono", tono)}
                className="p-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 text-left"
                style={
                  form.tono === tono
                    ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#374151" }
                }
              >
                <div>{tono}</div>
                <div className="text-xs opacity-60 font-normal mt-0.5">{TONO_DESCRIPCION[tono]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Opciones
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                style={{ backgroundColor: form.incluirHashtags ? "#f9b23b" : "#d1d5db" }}
                onClick={() => setField("incluirHashtags", !form.incluirHashtags)}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 shadow"
                  style={{ left: form.incluirHashtags ? "calc(100% - 22px)" : "2px" }}
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">Incluir hashtags</div>
                <div className="text-xs text-gray-400">Añade hashtags relevantes al contenido</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                style={{ backgroundColor: form.incluirEmojis ? "#f9b23b" : "#d1d5db" }}
                onClick={() => setField("incluirEmojis", !form.incluirEmojis)}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 shadow"
                  style={{ left: form.incluirEmojis ? "calc(100% - 22px)" : "2px" }}
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">Incluir emojis</div>
                <div className="text-xs text-gray-400">Añade emojis para más expresividad</div>
              </div>
            </label>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || !form.nombreOrganizacion.trim() || !form.tema.trim()}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{ backgroundColor: "#f9b23b", fontFamily: "Montserrat, sans-serif" }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generando contenido...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              ✨ Generar contenido
            </span>
          )}
        </button>

        {form.redSocial === "TikTok" && (
          <p className="text-center text-xs text-gray-400">
            Para TikTok se generará un script de video completo (sin imagen)
          </p>
        )}
      </form>
    </div>
  );
}
