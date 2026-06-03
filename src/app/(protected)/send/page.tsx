"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const REDES = ["Instagram", "Facebook", "TikTok"];

export default function SendPage() {
  const [email, setEmail] = useState("");
  const [dia, setDia] = useState("Lunes");
  const [redes, setRedes] = useState<string[]>(["Instagram"]);
  const [incluirImagenes, setIncluirImagenes] = useState(true);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleRed = (r: string) =>
    setRedes(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate API call
    setSent(true);
    setLoading(false);
  };

  const pill = (active: boolean) => active
    ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" }
    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" };

  if (sent) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6"
        style={{ backgroundColor: "#f0f7e6" }}>✅</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">¡Configurado!</h2>
      <p className="text-sm text-gray-500 mb-2">Recibirás tu resumen semanal cada <strong>{dia}</strong></p>
      <p className="text-sm text-gray-400 mb-8">en <strong>{email}</strong></p>
      <button onClick={() => setSent(false)}
        className="px-6 py-3 rounded-2xl font-semibold text-sm border-2 border-gray-200 text-gray-600">
        Cambiar configuración
      </button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Resumen semanal PDF</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recibe tus posts de la semana listos para usar</p>
      </div>

      {/* Preview card */}
      <div className="mx-5 mb-5 rounded-2xl overflow-hidden shadow-sm"
        style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Logo size="sm" />
            <span className="text-gray-400 text-xs">Resumen semanal</span>
          </div>
          <div className="space-y-2">
            {["Post Instagram · Campaña sostenibilidad", "Story Instagram · Evento próximo", "Post Facebook · Noticia del sector"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl p-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex-shrink-0" />
                <p className="text-white text-xs font-medium">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-[10px] text-center mt-3">Vista previa · PDF completo</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="px-5 space-y-4">
        {/* Email */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Enviar a
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" required
            className="w-full border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = "#f9b23b"}
            onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
        </div>

        {/* Día */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Día de envío
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d => (
              <button key={d} type="button" onClick={() => setDia(d)}
                className="px-3 py-2 rounded-full border-2 text-xs font-semibold transition-all"
                style={pill(dia === d)}>
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Redes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Incluir redes
          </label>
          <div className="flex gap-2">
            {REDES.map(r => (
              <button key={r} type="button" onClick={() => toggleRed(r)}
                className="px-4 py-2 rounded-full border-2 text-xs font-semibold transition-all"
                style={pill(redes.includes(r))}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <button type="button" onClick={() => setIncluirImagenes(v => !v)}
            className="w-full flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-700">Incluir imágenes generadas</p>
              <p className="text-xs text-gray-400">Adjunta las imágenes de cada post</p>
            </div>
            <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ backgroundColor: incluirImagenes ? "#f9b23b" : "#e5e7eb" }}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all"
                style={{ left: incluirImagenes ? "calc(100% - 22px)" : "2px" }} />
            </div>
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#f9b23b" }}>
          {loading ? <span className="flex items-center justify-center gap-2"><Spinner />Configurando...</span> : "Activar envío semanal 📤"}
        </button>
      </form>
    </div>
  );
}
