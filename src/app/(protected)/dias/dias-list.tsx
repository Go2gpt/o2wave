"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { createClient } from "@/lib/supabase";
import { CATEGORIA_LABEL, CATEGORIA_COLOR, type DiaProximo } from "@/lib/categorias";

function etiquetaFecha(d: DiaProximo): string {
  if (d.diffDays === 0) return "HOY";
  if (d.diffDays === 1) return "MAÑANA";
  return new Date(d.fechaISO).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

interface FechaForm { id: string | null; nombre: string; fecha: string; recurrente: boolean; descripcion: string; }
const FORM_VACIO: FechaForm = { id: null, nombre: "", fecha: "", recurrente: true, descripcion: "" };

function Tarjeta({ d, destacada, compacta, onEdit, onDelete }: {
  d: DiaProximo; destacada?: boolean; compacta?: boolean;
  onEdit?: (d: DiaProximo) => void; onDelete?: (d: DiaProximo) => void;
}) {
  const col = CATEGORIA_COLOR[d.categoria] || { bg: "#f3f4f6", color: "#4b5563" };
  const esMia = d.esFechaUsuario;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4" style={destacada ? { border: "2px solid #f9b23b" } : undefined}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
          {etiquetaFecha(d)}
        </span>
        {esMia ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
            ⭐ Mi fecha
          </span>
        ) : (
          <>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: col.bg, color: col.color }}>
              {CATEGORIA_LABEL[d.categoria] || d.categoria}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              {d.ambito === "espana" ? "🇪🇸 España" : "🌍 Internacional"}
            </span>
            {d.relevancia === "alto" && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#fef3e2", color: "#b86e00" }}
                title="Día con alta relevancia editorial">
                🔥 Destacado
              </span>
            )}
          </>
        )}
      </div>
      <p className="font-bold text-gray-900 text-sm">{d.nombre}</p>
      {!compacta && d.descripcion && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{d.descripcion}</p>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Link
          href={`/create?tema=${encodeURIComponent(d.nombre)}&fecha=${encodeURIComponent(d.fechaISO)}`}
          className="inline-block px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          style={{ backgroundColor: "#f9b23b" }}
        >
          ✨ Crear contenido
        </Link>
        {esMia && onEdit && (
          <button onClick={() => onEdit(d)} className="px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
            ✎ Editar
          </button>
        )}
        {esMia && onDelete && (
          <button onClick={() => onDelete(d)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ color: "#ef4444" }}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiasList({ proximos, hasCats, tieneFechas }: { proximos: DiaProximo[]; hasCats: boolean; tieneFechas: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FechaForm>(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Clasificación por SEMANA ISO (lunes-domingo), no por ventana móvil de 7 días.
  // Comparamos por fecha de calendario (YYYY-MM-DD) para evitar líos de zona horaria.
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoy = new Date();
  const diaSemana = (hoy.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
  const lunesEsta = new Date(hoy); lunesEsta.setDate(hoy.getDate() - diaSemana);
  const domingoEsta = new Date(lunesEsta); domingoEsta.setDate(lunesEsta.getDate() + 6);
  const lunesProx = new Date(lunesEsta); lunesProx.setDate(lunesEsta.getDate() + 7);
  const domingoProx = new Date(lunesEsta); domingoProx.setDate(lunesEsta.getDate() + 13);
  const finEsta = ymd(domingoEsta);
  const iniProx = ymd(lunesProx);
  const finProx = ymd(domingoProx);

  const fechaDe = (d: DiaProximo) => d.fechaISO.slice(0, 10);
  const hoyManana = proximos.filter((d) => d.diffDays <= 1);
  const semana = proximos.filter((d) => d.diffDays >= 2 && fechaDe(d) <= finEsta);
  const proxima = proximos.filter((d) => { const f = fechaDe(d); return f >= iniProx && f <= finProx; });
  const resto = proximos.filter((d) => fechaDe(d) > finProx);

  const abrirNueva = () => { setForm(FORM_VACIO); setModal(true); };
  const abrirEdicion = (d: DiaProximo) => {
    setForm({
      id: d.id,
      nombre: d.nombre,
      fecha: d.fechaISO.slice(0, 10),
      recurrente: d.recurrente !== false,
      descripcion: d.descripcion || "",
    });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.fecha) {
      setToast({ message: "El nombre y la fecha son obligatorios.", type: "error" });
      return;
    }
    setSaving(true);
    const [yy, mm, dd] = form.fecha.split("-").map(Number);
    const fila = {
      mes: mm,
      dia: dd,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      recurrente: form.recurrente,
      ano_especifico: form.recurrente ? null : yy,
    };
    try {
      if (form.id) {
        const { error } = await supabase.from("fechas_usuario").update(fila).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { error } = await supabase.from("fechas_usuario").insert({ ...fila, user_id: user.id });
        if (error) throw error;
      }
      setModal(false);
      setToast({ message: "Fecha guardada", type: "success" });
      router.refresh();
    } catch (e) {
      setToast({ message: `Error: ${e instanceof Error ? e.message : "no se pudo guardar"}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (d: DiaProximo) => {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    const { error } = await supabase.from("fechas_usuario").delete().eq("id", d.id);
    if (error) { setToast({ message: `Error: ${error.message}`, type: "error" }); return; }
    setToast({ message: "Fecha eliminada", type: "success" });
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dashboard">Inicio</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Días clave</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tus próximas oportunidades de contenido</p>
      </div>

      <div className="px-5 mb-4 space-y-2">
        <button onClick={abrirNueva}
          className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-all active:scale-[0.99]"
          style={{ borderColor: "#f9b23b", color: "#f9b23b" }}>
          + Añadir mi propia fecha
        </button>
        <Link href="/dias/mis-fechas" className="block text-center text-xs font-semibold text-gray-500 hover:text-gray-700">
          Gestionar mis fechas →
        </Link>
      </div>

      {proximos.length === 0 ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            {!hasCats && !tieneFechas ? (
              <>
                <div className="text-4xl mb-3">🗓️</div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Aún no has elegido categorías de interés</p>
                <p className="text-xs text-gray-400 mb-4">Ve a tu perfil para personalizar tu calendario, o añade tus propias fechas.</p>
                <Link href="/perfil?volver=/dias" className="inline-block px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: "#f9b23b" }}>
                  Ir a Mi Perfil
                </Link>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-semibold text-gray-700">No hay días clave próximos para tus categorías.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {hoyManana.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Hoy y mañana</p>
              <div className="space-y-3">{hoyManana.map((d) => <Tarjeta key={d.id} d={d} destacada onEdit={abrirEdicion} onDelete={eliminar} />)}</div>
            </section>
          )}
          {semana.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Esta semana</p>
              <div className="space-y-3">{semana.map((d) => <Tarjeta key={d.id} d={d} onEdit={abrirEdicion} onDelete={eliminar} />)}</div>
            </section>
          )}
          {proxima.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Próxima semana</p>
              <div className="space-y-3">{proxima.map((d) => <Tarjeta key={d.id} d={d} onEdit={abrirEdicion} onDelete={eliminar} />)}</div>
            </section>
          )}
          {resto.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Más adelante</p>
              <div className="space-y-2">{resto.map((d) => <Tarjeta key={d.id} d={d} compacta onEdit={abrirEdicion} onDelete={eliminar} />)}</div>
            </section>
          )}
        </div>
      )}

      {/* Modal añadir / editar fecha */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4" onClick={() => !saving && setModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{form.id ? "Editar fecha" : "Añadir mi fecha"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre del evento</label>
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  maxLength={80} placeholder="Ej: Aniversario de la fundación"
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                  onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                  onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, recurrente: !f.recurrente }))} className="w-full flex items-center justify-between py-1">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">Recurrente cada año</p>
                  <p className="text-xs text-gray-400">Se repetirá anualmente en esta fecha</p>
                </div>
                <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0" style={{ backgroundColor: form.recurrente ? "#f9b23b" : "#e5e7eb" }}>
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all" style={{ left: form.recurrente ? "calc(100% - 22px)" : "2px" }} />
                </div>
              </button>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={2} maxLength={200} placeholder="Contexto para el contenido…"
                  className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none resize-none"
                  onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
              </div>
            </div>
            <button onClick={guardar} disabled={saving}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm mt-4 disabled:opacity-50" style={{ backgroundColor: "#f9b23b" }}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setModal(false)} disabled={saving} className="w-full py-2.5 text-sm text-gray-500 font-medium">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
