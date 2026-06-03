"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const PLAN_INFO: Record<string, { label: string; color: string; icon: string }> = {
  free:       { label: "Gratis", color: "#6b7280", icon: "🆓" },
  basico:     { label: "Básico", color: "#93bf30", icon: "🌱" },
  pro:        { label: "Pro",    color: "#f9b23b", icon: "⚡" },
  enterprise: { label: "Enterprise", color: "#6366f1", icon: "🚀" },
};

const SECTORES: Record<string, string> = {
  general: "General", educacion: "Educación", salud: "Salud",
  medio_ambiente: "Medio Ambiente", social: "Acción Social",
  cultura: "Cultura", comercio: "Comercio", tecnologia: "Tecnología", deporte: "Deporte",
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("general");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            setNombre(data.nombre_entidad || "");
            setSector(data.sector || "general");
          }
        });
    });
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from("profiles").update({ nombre_entidad: nombre, sector }).eq("id", profile.id);
    setProfile(p => p ? { ...p, nombre_entidad: nombre, sector } : p);
    setEditing(false);
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/welcome");
  };

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>;

  const plan = PLAN_INFO[profile.plan] || PLAN_INFO.free;

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
        <Logo size="sm" />
      </div>

      {/* Avatar + name */}
      <div className="px-5 mb-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f9b23b 0%, #f0a020 100%)" }}>
            {(profile.nombre_entidad || profile.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{profile.nombre_entidad || "Sin nombre"}</p>
            <p className="text-xs text-gray-400 truncate">{profile.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm">{plan.icon}</span>
              <span className="text-xs font-bold" style={{ color: plan.color }}>Plan {plan.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit section */}
      <div className="px-5 mb-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos de la entidad</p>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold" style={{ color: "#f9b23b" }}>
                ✏️ Editar
              </button>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombre</p>
            {editing ? (
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none transition-colors"
                onFocus={e => e.target.style.borderColor = "#f9b23b"}
                onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{nombre || "—"}</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tipo</p>
            <p className="text-sm font-semibold text-gray-800 capitalize">{profile.tipo_entidad || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sector</p>
            {editing ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SECTORES).map(([k, v]) => (
                  <button key={k} onClick={() => setSector(k)}
                    className="px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all"
                    style={sector === k
                      ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                      : { borderColor: "#e5e7eb", color: "#6b7280" }}>
                    {v}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-800">{SECTORES[sector] || sector}</p>
            )}
          </div>

          {editing && (
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: "#f9b23b" }}>
              {saving ? <span className="flex items-center justify-center gap-2"><Spinner />Guardando...</span> : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>

      {/* Plan */}
      <div className="px-5 mb-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Plan actual</p>
              <p className="font-bold" style={{ color: plan.color }}>{plan.icon} Plan {plan.label}</p>
            </div>
            {profile.plan === "free" && (
              <a href="/plans"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: "#f9b23b" }}>
                Mejorar
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 space-y-2 mb-5">
        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all"
          style={{ borderColor: "#e5e7eb", color: "#374151" }}>
          Cerrar sesión
        </button>
        <button onClick={() => setShowDelete(true)}
          className="w-full py-3 text-sm font-medium text-red-400">
          Darse de baja
        </button>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-2">¿Darse de baja?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción eliminará tu cuenta y todos tus datos. No se puede deshacer.</p>
            <button className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm mb-2">
              Sí, eliminar mi cuenta
            </button>
            <button onClick={() => setShowDelete(false)} className="w-full py-3 text-sm text-gray-500 font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
