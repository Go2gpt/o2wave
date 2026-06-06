"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Spinner from "@/components/ui/Spinner";
import Toast, { type ToastState } from "@/components/Toast";
import { createClient } from "@/lib/supabase";

const inputCls = "w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors";
const onF = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#f9b23b");
const onB = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#f3f4f6");

export default function CambiarPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva.length < 8) { setToast({ message: "La nueva contraseña debe tener al menos 8 caracteres.", type: "error" }); return; }
    if (nueva !== confirmar) { setToast({ message: "Las contraseñas no coinciden.", type: "error" }); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { router.push("/login"); return; }

      // Verifica la contraseña actual reautenticando.
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: actual });
      if (signErr) { setToast({ message: "La contraseña actual no es correcta.", type: "error" }); setLoading(false); return; }

      const { error: updErr } = await supabase.auth.updateUser({ password: nueva });
      if (updErr) { setToast({ message: `Error: ${updErr.message}`, type: "error" }); setLoading(false); return; }

      setToast({ message: "Contraseña actualizada", type: "success" });
      setActual(""); setNueva(""); setConfirmar("");
      setTimeout(() => router.push("/perfil"), 1200);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Error", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/perfil">Mi perfil</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Cambiar contraseña</h1>
      </div>

      <form onSubmit={submit} className="px-5 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Contraseña actual</label>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} required className={inputCls} onFocus={onF} onBlur={onB} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nueva contraseña</label>
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required className={inputCls} onFocus={onF} onBlur={onB} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirmar nueva contraseña</label>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required className={inputCls} onFocus={onF} onBlur={onB} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#f9b23b" }}>
          {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando...</span> : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
