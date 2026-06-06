"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Spinner from "@/components/ui/Spinner";
import Toast, { type ToastState } from "@/components/Toast";
import ChipsInput from "@/components/ChipsInput";
import InstallButton from "@/components/InstallButton";
import { createClient } from "@/lib/supabase";
import { normalizarMarca } from "@/lib/formatText";
import { CATEGORIAS, CATEGORIA_LABEL } from "@/lib/categorias";

export interface ProfileData {
  id: string;
  email: string;
  nombre_entidad: string | null;
  tipo_entidad: string | null;
  nif: string | null;
  estado_verificacion: string | null;
  mision_valores: string | null;
  publico_objetivo: string | null;
  servicios_programas: string | null;
  causas_o_productos: string | null;
  temas_prioritarios: string[] | null;
  tipo_publicaciones: string | null;
  estilo_visual: string | null;
  geografia: string | null;
  idioma_principal: string | null;
  hashtags_sugeridos: string[] | null;
  logros_numeros: string | null;
  info_extra: string | null;
  pack_semanal_activo: boolean | null;
  pack_dias_semana: number | null;
  redes_activas: string[] | null;
}

const REDES_PACK = [
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "facebook", label: "Facebook", emoji: "👥" },
  { value: "tiktok", label: "TikTok", emoji: "🎵" },
];
const DIAS_SEMANA_OPC = [3, 4, 5, 6, 7];

interface Editable {
  nombre_entidad: string;
  mision_valores: string;
  publico_objetivo: string;
  servicios_programas: string;
  causas_o_productos: string;
  temas_prioritarios: string[];
  tipo_publicaciones: string;
  estilo_visual: string;
  geografia: string;
  idioma_principal: string;
  hashtags_sugeridos: string[];
  logros_numeros: string;
  info_extra: string;
  colores_marca: string[];
}

const TIPO_LABEL: Record<string, string> = {
  ong_pequena: "ONG pequeña", ong_mediana: "ONG mediana", empresa: "Empresa",
};
const IDIOMAS = [{ v: "es", l: "Español" }, { v: "en", l: "Inglés" }, { v: "ca", l: "Catalán" }];
const HEX = /^#[0-9A-Fa-f]{6}$/;
const inputCls = "w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors";
const onF = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "#f9b23b");
const onB = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "#f3f4f6");

function maskNif(nif: string | null): string {
  if (!nif) return "—";
  if (nif.length <= 6) return nif;
  return `${nif.slice(0, 3)}***${nif.slice(-3)}`;
}

// Definidos a nivel de módulo para no perder el foco de los inputs en cada render.
function TextField({ label, value, onChange, max, hint }: {
  label: string; value: string; onChange: (v: string) => void; max?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className={inputCls} onFocus={onF} onBlur={onB} />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
function AreaField({ label, value, onChange, max }: {
  label: string; value: string; onChange: (v: string) => void; max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
        <span className="text-[10px] text-gray-300">{value.length}/{max}</span>
      </div>
      <textarea value={value} maxLength={max} rows={3} onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-none`} onFocus={onF} onBlur={onB} />
    </div>
  );
}

export default function ProfileForm({
  initial, categoriasIniciales, mostrarDiasEspana,
}: {
  initial: ProfileData;
  categoriasIniciales: string[];
  mostrarDiasEspana: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const initEditable: Editable = {
    nombre_entidad: initial.nombre_entidad || "",
    mision_valores: initial.mision_valores || "",
    publico_objetivo: initial.publico_objetivo || "",
    servicios_programas: initial.servicios_programas || "",
    causas_o_productos: initial.causas_o_productos || "",
    temas_prioritarios: initial.temas_prioritarios || [],
    tipo_publicaciones: initial.tipo_publicaciones || "",
    estilo_visual: initial.estilo_visual || "",
    geografia: initial.geografia || "",
    idioma_principal: initial.idioma_principal || "es",
    hashtags_sugeridos: initial.hashtags_sugeridos || [],
    logros_numeros: initial.logros_numeros || "",
    info_extra: initial.info_extra || "",
    colores_marca: (initial as ProfileData & { colores_marca?: string[] }).colores_marca || [],
  };

  const [form, setForm] = useState<Editable>(initEditable);
  const [cats, setCats] = useState<string[]>(categoriasIniciales);
  const [mostrarEspana, setMostrarEspana] = useState<boolean>(mostrarDiasEspana);
  // Pack semanal automático
  const packActivoIni = initial.pack_semanal_activo ?? false;
  const packDiasIni = initial.pack_dias_semana ?? 5;
  const redesIni = (initial.redes_activas && initial.redes_activas.length ? initial.redes_activas : ["instagram"]);
  const [packActivo, setPackActivo] = useState<boolean>(packActivoIni);
  const [packDias, setPackDias] = useState<number>(packDiasIni);
  const [redes, setRedes] = useState<string[]>(redesIni);
  const toggleRed = (r: string) => setRedes((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteText, setDeleteText] = useState("");

  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (c: string) => setCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const catsDirty = JSON.stringify([...cats].sort()) !== JSON.stringify([...categoriasIniciales].sort());
  const packDirty =
    packActivo !== packActivoIni ||
    packDias !== packDiasIni ||
    JSON.stringify([...redes].sort()) !== JSON.stringify([...redesIni].sort());
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initEditable) ||
    catsDirty ||
    mostrarEspana !== mostrarDiasEspana ||
    packDirty;

  const esEmpresa = initial.tipo_entidad === "empresa";

  const handleSave = async () => {
    if (!form.nombre_entidad.trim()) { setToast({ message: "El nombre de la entidad es obligatorio.", type: "error" }); return; }
    const colsInvalidos = form.colores_marca.some((c) => !HEX.test(c));
    if (colsInvalidos) { setToast({ message: "Algún color no es un hex válido (#RRGGBB).", type: "error" }); return; }

    setSaving(true);
    // Solo campos editables: nunca tipo_entidad, nif, estado_verificacion, es_admin, email.
    const payload = {
      nombre_entidad: normalizarMarca(form.nombre_entidad.trim()),
      mision_valores: form.mision_valores || null,
      publico_objetivo: form.publico_objetivo || null,
      servicios_programas: form.servicios_programas || null,
      causas_o_productos: form.causas_o_productos || null,
      temas_prioritarios: form.temas_prioritarios,
      tipo_publicaciones: form.tipo_publicaciones || null,
      estilo_visual: form.estilo_visual || null,
      geografia: form.geografia || null,
      idioma_principal: form.idioma_principal || null,
      hashtags_sugeridos: form.hashtags_sugeridos,
      logros_numeros: form.logros_numeros || null,
      info_extra: form.info_extra || null,
      colores_marca: form.colores_marca,
      mostrar_dias_espana: mostrarEspana,
      pack_semanal_activo: packActivo,
      pack_dias_semana: packDias,
      redes_activas: redes.length ? redes : ["instagram"],
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", initial.id);
    if (error) { setSaving(false); setToast({ message: `Error: ${error.message}`, type: "error" }); return; }

    // Categorías de interés: reemplazar el conjunto (borrar + insertar).
    if (catsDirty) {
      await supabase.from("categorias_usuario").delete().eq("user_id", initial.id);
      if (cats.length) {
        const { error: cErr } = await supabase
          .from("categorias_usuario")
          .insert(cats.map((c) => ({ user_id: initial.id, categoria: c })));
        if (cErr) { setSaving(false); setToast({ message: `Error al guardar categorías: ${cErr.message}`, type: "error" }); return; }
      }
    }

    setSaving(false);
    setToast({ message: "Cambios guardados", type: "success" });

    // Si venimos de otra pantalla (?volver=/ruta), volvemos allí tras guardar.
    // Validamos que sea una ruta interna (empieza por "/" pero no "//", para
    // evitar URLs externas / protocol-relative), igual que el ?redirect del login.
    const volver = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("volver")
      : null;
    if (volver && volver.startsWith("/") && !volver.startsWith("//")) {
      setTimeout(() => router.push(volver), 900);
    } else {
      router.refresh();
    }
  };

  const logout = async () => { await supabase.auth.signOut(); router.push("/welcome"); };

  const eliminarCuenta = async () => {
    // Placeholder: la RPC aún no existe. Mostramos aviso.
    try { await supabase.rpc("eliminar_mi_cuenta"); } catch {}
    setDeleteStep(0); setDeleteText("");
    setToast({ message: "Función pendiente, contacta con soporte.", type: "error" });
  };

  const VERIF: Record<string, { label: string; bg: string; color: string }> = {
    verificada: { label: "Verificada", bg: "#f0f7e6", color: "#3f6212" },
    pendiente: { label: "Pendiente", bg: "#fff8ef", color: "#b9791a" },
    rechazada: { label: "Rechazada", bg: "#fef2f2", color: "#b91c1c" },
  };
  const verif = VERIF[initial.estado_verificacion || "pendiente"];

  return (
    <div className="max-w-lg mx-auto pb-40">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Cabecera */}
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dashboard">Inicio</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Sección 1 — Datos de la entidad */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Datos de la entidad</h2>
          <TextField label="Nombre de la entidad" value={form.nombre_entidad} onChange={(v) => set("nombre_entidad", v)} max={100} />
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
            <input value={initial.email} disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
            <p className="text-[11px] text-gray-400 mt-1">Para cambiar el email, contacta con soporte.</p>
          </div>
        </section>

        {/* Sección 2 — Datos de la marca */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Datos de la marca</h2>
          <AreaField label="Misión y valores" value={form.mision_valores} onChange={(v) => set("mision_valores", v)} max={500} />
          <AreaField label="Público objetivo" value={form.publico_objetivo} onChange={(v) => set("publico_objetivo", v)} max={300} />
          <AreaField label="Servicios o programas" value={form.servicios_programas} onChange={(v) => set("servicios_programas", v)} max={300} />
          <AreaField label="Causas o productos" value={form.causas_o_productos} onChange={(v) => set("causas_o_productos", v)} max={300} />

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Temas prioritarios</label>
            <ChipsInput value={form.temas_prioritarios} onChange={(v) => set("temas_prioritarios", v)} placeholder="Añadir tema" />
          </div>

          <TextField label="Tipo de publicaciones" value={form.tipo_publicaciones} onChange={(v) => set("tipo_publicaciones", v)} />
          <TextField label="Estilo visual" value={form.estilo_visual} onChange={(v) => set("estilo_visual", v)} />
          <TextField label="Geografía / ámbito" value={form.geografia} onChange={(v) => set("geografia", v)} />

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Idioma principal</label>
            <select value={form.idioma_principal} onChange={(e) => set("idioma_principal", e.target.value)}
              className={inputCls} onFocus={onF} onBlur={onB}>
              {IDIOMAS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hashtags sugeridos</label>
            <ChipsInput value={form.hashtags_sugeridos} onChange={(v) => set("hashtags_sugeridos", v)} placeholder="#hashtag" />
          </div>

          <AreaField label="Logros y números" value={form.logros_numeros} onChange={(v) => set("logros_numeros", v)} max={300} />
          <AreaField label="Información extra" value={form.info_extra} onChange={(v) => set("info_extra", v)} max={500} />

          {/* Colores de marca */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Colores de marca (1-5)</label>
            <div className="space-y-2">
              {form.colores_marca.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: HEX.test(c) ? c : "#fff" }} />
                  <input value={c} onChange={(e) => set("colores_marca", form.colores_marca.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                    placeholder="#RRGGBB" className={inputCls} onFocus={onF} onBlur={onB} />
                  <button type="button" onClick={() => set("colores_marca", form.colores_marca.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-500 font-bold px-2">×</button>
                </div>
              ))}
            </div>
            {form.colores_marca.length < 5 && (
              <button type="button" onClick={() => set("colores_marca", [...form.colores_marca, "#000000"])}
                className="mt-2 text-xs font-semibold" style={{ color: "#f9b23b" }}>
                + Añadir color
              </button>
            )}
          </div>
        </section>

        {/* Sección — Mis categorías de interés */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Mis categorías de interés</h2>
            <p className="text-xs text-gray-400 mt-0.5">Elige qué temas quieres que aparezcan en tu calendario de días clave.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => {
              const sel = cats.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCat(c)}
                  className="px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all"
                  style={sel
                    ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}>
                  {CATEGORIA_LABEL[c]}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setMostrarEspana((v) => !v)} className="w-full flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-700">Mostrar también días específicos de España</p>
              <p className="text-xs text-gray-400">Además de los internacionales</p>
            </div>
            <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ backgroundColor: mostrarEspana ? "#f9b23b" : "#e5e7eb" }}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all"
                style={{ left: mostrarEspana ? "calc(100% - 22px)" : "2px" }} />
            </div>
          </button>
        </section>

        {/* Sección — Pack semanal automático */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <button type="button" onClick={() => setPackActivo((v) => !v)} className="w-full flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-sm font-bold text-gray-800">Pack semanal automático</h2>
              <p className="text-xs text-gray-400 mt-0.5">Activar envío semanal automático</p>
            </div>
            <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ backgroundColor: packActivo ? "#f9b23b" : "#e5e7eb" }}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all"
                style={{ left: packActivo ? "calc(100% - 22px)" : "2px" }} />
            </div>
          </button>

          {packActivo && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Días por semana</label>
                <select value={packDias} onChange={(e) => setPackDias(Number(e.target.value))}
                  className={inputCls} onFocus={onF} onBlur={onB}>
                  {DIAS_SEMANA_OPC.map((n) => <option key={n} value={n}>{n} días</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Redes activas</label>
                <div className="flex flex-wrap gap-2">
                  {REDES_PACK.map(({ value, label, emoji }) => {
                    const sel = redes.includes(value);
                    return (
                      <button key={value} type="button" onClick={() => toggleRed(value)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all"
                        style={sel
                          ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                          : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}>
                        <span>{emoji}</span><span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-gray-400 leading-relaxed">
            Cada domingo por la noche generamos automáticamente tu plan de contenido. Lo recibirás por email y podrás verlo dentro de la app.
          </p>
        </section>

        {/* Sección 3 — Solo lectura */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Información de la cuenta</h2>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tipo de cuenta</p>
            <p className="text-sm font-semibold text-gray-800">{TIPO_LABEL[initial.tipo_entidad || ""] || initial.tipo_entidad || "—"}</p>
            <p className="text-[11px] text-gray-400 mt-1">Si necesitas cambiar el tipo de cuenta, contacta con soporte.</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">NIF / CIF</p>
            <p className="text-sm font-semibold text-gray-800 font-mono">{maskNif(initial.nif)}</p>
            <p className="text-[11px] text-gray-400 mt-1">Si tu NIF es incorrecto, contacta con soporte.</p>
          </div>
          {!esEmpresa && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Verificación</p>
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: verif.bg, color: verif.color }}>{verif.label}</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Información legal</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link href="/privacidad" className="text-gray-600 hover:text-gray-900">Política de privacidad →</Link>
              <Link href="/terminos" className="text-gray-600 hover:text-gray-900">Términos y condiciones →</Link>
              <Link href="/cookies" className="text-gray-600 hover:text-gray-900">Política de cookies →</Link>
            </div>
          </div>
        </section>

        {/* Sección 4 — Seguridad */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Seguridad</h2>
          <button onClick={() => router.push("/perfil/cambiar-password")}
            className="w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
            🔒 Cambiar contraseña
          </button>
          <InstallButton />
        </section>

        {/* Sección 5 — Zona de peligro */}
        <section className="space-y-2">
          <button onClick={logout}
            className="w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
            Cerrar sesión
          </button>
          <button onClick={() => setDeleteStep(1)} className="w-full py-3 text-sm font-medium text-red-500">
            Eliminar cuenta
          </button>
        </section>
      </div>

      {/* Botón guardar sticky (solo si hay cambios). Va POR ENCIMA de la
          NavBottom (~80px, z-50): z-index mayor y desplazado sobre la nav. */}
      {dirty && (
        <div className="fixed left-0 right-0 z-[60] bg-white border-t border-gray-100 px-5 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
          <div className="max-w-lg mx-auto">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {saving ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando...</span> : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Modal eliminar cuenta — doble confirmación */}
      {deleteStep > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70]"
          onClick={() => { setDeleteStep(0); setDeleteText(""); }}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
            {deleteStep === 1 ? (
              <>
                <h3 className="font-bold text-gray-900 mb-2">¿Estás seguro?</h3>
                <p className="text-sm text-gray-500 mb-5">Esta acción eliminará tu cuenta y todos tus datos. No se puede deshacer.</p>
                <button onClick={() => setDeleteStep(2)} className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm mb-2">Sí, continuar</button>
                <button onClick={() => setDeleteStep(0)} className="w-full py-3 text-sm text-gray-500 font-medium">Cancelar</button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-2">Escribe ELIMINAR para confirmar</h3>
                <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="ELIMINAR"
                  className={`${inputCls} mb-4`} onFocus={onF} onBlur={onB} />
                <button onClick={eliminarCuenta} disabled={deleteText !== "ELIMINAR"}
                  className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm mb-2 disabled:opacity-40">
                  Eliminar definitivamente
                </button>
                <button onClick={() => { setDeleteStep(0); setDeleteText(""); }} className="w-full py-3 text-sm text-gray-500 font-medium">Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
