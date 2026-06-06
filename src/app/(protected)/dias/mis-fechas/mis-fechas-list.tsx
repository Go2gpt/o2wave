"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { createClient } from "@/lib/supabase";
import type { FechaUsuario } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");
const fechaLarga = (mes: number, dia: number) =>
  new Date(2000, mes - 1, dia).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

interface FechaForm { id: string | null; nombre: string; fecha: string; recurrente: boolean; descripcion: string; }
const FORM_VACIO: FechaForm = { id: null, nombre: "", fecha: "", recurrente: true, descripcion: "" };

export default function MisFechasList({ fechas }: { fechas: FechaUsuario[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FechaForm>(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const abrirNueva = () => { setForm(FORM_VACIO); setModal(true); };
  const abrirEdicion = (f: FechaUsuario) => {
    const ano = f.recurrente ? new Date().getFullYear() : (f.ano_especifico ?? new Date().getFullYear());
    setForm({
      id: f.id,
      nombre: f.nombre,
      fecha: `${ano}-${pad(f.mes)}-${pad(f.dia)}`,
      recurrente: f.recurrente,
      descripcion: f.descripcion || "",
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
      mes: mm, dia: dd,
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

  const eliminar = async (f: FechaUsuario) => {
    if (!confirm(`¿Eliminar "${f.nombre}"?`)) return;
    const { error } = await supabase.from("fechas_usuario").delete().eq("id", f.id);
    if (error) { setToast({ message: `Error: ${error.message}`, type: "error" }); return; }
    setToast({ message: "Fecha eliminada", type: "success" });
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dias">Calendario</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Todas mis fechas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona tus fechas importantes del año</p>
      </div>

      <div className="px-5 mb-4">
        <button onClick={abrirNueva}
          className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-all active:scale-[0.99]"
          style={{ borderColor: "#f9b23b", color: "#f9b23b" }}>
          + Añadir mi propia fecha
        </button>
      </div>

      {fechas.length === 0 ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Aún no tienes fechas propias</p>
            <p className="text-xs text-gray-400">Añade aniversarios, hitos o cualquier fecha importante para tu organización.</p>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-3">
          {fechas.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
                  {fechaLarga(f.mes, f.dia)}
                </span>
                {f.recurrente ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">🔁 Cada año</span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Solo {f.ano_especifico}</span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">{f.nombre}</p>
              {f.descripcion && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.descripcion}</p>}
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => abrirEdicion(f)} className="px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}>✎ Editar</button>
                <button onClick={() => eliminar(f)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ color: "#ef4444" }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal añadir / editar */}
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
