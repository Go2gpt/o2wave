"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";

interface BrandAnalysis {
  nombre: string;
  tipo: string;
  sector: string;
  colores: string[];
  tipografia: string;
  estilo: string;
  descripcion: string;
}

const SECTORES = ["general", "educacion", "salud", "medio_ambiente", "social", "cultura", "comercio", "tecnologia", "deporte"];
const SECTOR_LABELS: Record<string, string> = {
  general: "General", educacion: "Educación", salud: "Salud",
  medio_ambiente: "Medio Ambiente", social: "Acción Social", cultura: "Cultura",
  comercio: "Comercio", tecnologia: "Tecnología", deporte: "Deporte",
};

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("general");
  const [colores, setColores] = useState<string[]>([]);
  const [tipografia, setTipografia] = useState("");
  const [estilo, setEstilo] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("brand_analysis");
    if (!stored) { router.push("/onboarding/web"); return; }
    const data: BrandAnalysis = JSON.parse(stored);
    setAnalysis(data);
    setNombre(data.nombre || "");
    setSector(data.sector || "general");
    setColores(data.colores || ["#93bf30", "#f9b23b", "#0F0F0F"]);
    setTipografia(data.tipografia || "Montserrat");
    setEstilo(data.estilo || "");
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const webUrl = sessionStorage.getItem("web_url") || "";

      // Save brand identity
      await supabase.from("brand_identity").upsert({
        user_id: user.id,
        colores,
        tipografia,
        estilo,
        web_url: webUrl,
        raw_analysis: analysis as Record<string, unknown>,
      }, { onConflict: "user_id" });

      // Update profile
      await supabase.from("profiles").update({
        nombre_entidad: nombre,
        sector,
        web_url: webUrl,
        onboarding_complete: true,
      }).eq("id", user.id);

      sessionStorage.removeItem("brand_analysis");
      sessionStorage.removeItem("web_url");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!analysis) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={8} color="gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <Logo size="md" />
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1">
            {[0, 1].map(i => (
              <div key={i} className="h-1.5 rounded-full"
                style={{ width: "24px", backgroundColor: "#f9b23b" }} />
            ))}
          </div>
          <span className="text-xs text-gray-400">2 de 2</span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-5 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Tu identidad visual</h1>
          <p className="text-sm text-gray-500">Esto es lo que hemos detectado. Puedes editarlo.</p>
        </div>

        {/* Colors */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Colores detectados</p>
          <div className="flex gap-3 flex-wrap">
            {colores.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-xl shadow-sm border border-white"
                  style={{ backgroundColor: c }} />
                {editMode ? (
                  <input type="color" value={c} onChange={e => setColores(cols => cols.map((col, j) => j === i ? e.target.value : col))}
                    className="w-12 h-6 rounded cursor-pointer border-0 p-0" />
                ) : (
                  <span className="text-[10px] font-mono text-gray-500">{c}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Typography & Style */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipografía & Estilo</p>
          {editMode ? (
            <>
              <input value={tipografia} onChange={e => setTipografia(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
                onFocus={e => e.target.style.borderColor = "#f9b23b"}
                onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
              <input value={estilo} onChange={e => setEstilo(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
                onFocus={e => e.target.style.borderColor = "#f9b23b"}
                onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-800">{tipografia}</p>
              <p className="text-sm text-gray-500">{estilo}</p>
            </>
          )}
        </div>

        {/* Nombre */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre de la entidad</p>
          {editMode ? (
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
              onFocus={e => e.target.style.borderColor = "#f9b23b"}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          ) : (
            <p className="text-sm font-bold text-gray-800">{nombre || "—"}</p>
          )}
        </div>

        {/* Sector */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sector</p>
          <div className="flex flex-wrap gap-2">
            {SECTORES.map(s => (
              <button key={s} type="button"
                onClick={() => editMode && setSector(s)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                style={sector === s
                  ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
                  : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280", opacity: editMode ? 1 : 0.5 }}>
                {SECTOR_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Edit toggle */}
        <button onClick={() => setEditMode(e => !e)}
          className="w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all"
          style={editMode
            ? { borderColor: "#93bf30", color: "#93bf30", backgroundColor: "#f0f7e6" }
            : { borderColor: "#e5e7eb", color: "#6b7280" }}>
          {editMode ? "✓ Guardar cambios" : "✏️ Editar identidad"}
        </button>

        {/* Confirm */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#f9b23b" }}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Guardando...
            </span>
          ) : "Confirmar y continuar →"}
        </button>
      </div>
    </div>
  );
}
