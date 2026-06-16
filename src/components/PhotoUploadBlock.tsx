"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
// HEIC (iPhone) se acepta y el backend lo convierte a JPEG automáticamente.
const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/heic", "image/heif"];
const EXT_PERMITIDAS = /\.(jpe?g|png|heic|heif)$/i;

interface Props {
  /** ¿El plan del usuario incluye image_edit (Pro)? */
  habilitado: boolean;
  /** Foto elegida (o null). El File se envía al backend en multipart; NO se sube a Storage desde el cliente. */
  foto: File | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  previewUrl: string | null;
}

/**
 * Bloque "Foto tuya (opcional)" del formulario de creación. Solo Pro puede
 * adjuntar; el resto ve un upsell hacia /plans. La foto se mantiene como File en
 * el estado del padre y se envía al endpoint en multipart/form-data al generar
 * (sin subida directa cliente→Storage, que rompía en Safari iOS).
 */
export default function PhotoUploadBlock({ habilitado, foto, onChange, previewUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [convirtiendo, setConvirtiendo] = useState(false);

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-seleccionar el mismo archivo
    if (!file) return;
    setError("");
    // iOS a veces da file.type vacío para HEIC → validamos también por extensión.
    if (!MIME_PERMITIDOS.includes(file.type) && !EXT_PERMITIDAS.test(file.name)) {
      setError("Usa una imagen JPEG, PNG o HEIC."); return;
    }
    if (file.size > MAX_BYTES) { setError("La foto supera el límite de 8 MB."); return; }

    // HEIC (iPhone) → convertir a JPEG EN EL NAVEGADOR (ahorra ~10-15s frente a
    // hacerlo en el backend). heic2any usa wasm y window, por eso import dinámico.
    let finalFile = file;
    const esHeic = file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
    if (esHeic) {
      setConvirtiendo(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const jpegBlob = Array.isArray(out) ? out[0] : out;
        finalFile = new File([jpegBlob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      } catch (err) {
        // Si la conversión en cliente falla, mandamos el HEIC y el backend lo
        // convierte (fallback). No bloqueamos al usuario.
        console.warn("heic2any falló, se enviará el HEIC al backend:", err);
        finalFile = file;
      } finally {
        setConvirtiendo(false);
      }
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(finalFile, URL.createObjectURL(finalFile));
  };

  const quitar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(null, null);
  };

  // --- Plan inferior: bloque bloqueado con upsell ---
  if (!habilitado) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm opacity-90">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto tuya (opcional)</label>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>🔒 Pro</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Sube una foto tuya y la integraremos en la imagen generada. Ej: <em>&quot;yo sujetando un cuadro con fondo de mariposas&quot;</em>.
        </p>
        <Link href="/plans" className="inline-block mt-3 text-sm font-bold" style={{ color: "#f9b23b" }}>
          🔒 Disponible en plan Pro →
        </Link>
      </div>
    );
  }

  // --- Pro: adjuntar foto ---
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Foto tuya (opcional)</label>
      <p className="text-xs text-gray-400 mb-3">
        Sube una foto tuya y la integraremos en la imagen generada según tu descripción. JPEG, PNG o HEIC (iPhone), máx. 8 MB.
      </p>

      {foto && previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Tu foto" className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: "#f9b23b" }} />
          <button type="button" onClick={quitar} className="text-sm font-bold" style={{ color: "#dc2743" }}>Quitar</button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={convirtiendo}
          className="px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          style={{ borderColor: "#f9b23b", color: "#f9b23b" }}>
          {convirtiendo ? "Convirtiendo..." : "📷 Subir foto"}
        </button>
      )}

      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        ℹ️ OpenAI puede rechazar fotos con rostros muy reconocibles. Si pasa, prueba con una foto donde aparezcas de perfil, de lejos o con elementos distintivos (gafas, atuendo, escenario).
      </p>

      {error && <p className="text-xs text-red-600 font-medium mt-2">⚠️ {error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" onChange={elegir} className="hidden" />
    </div>
  );
}
