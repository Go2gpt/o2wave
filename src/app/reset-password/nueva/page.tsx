"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import PasswordInput from "@/components/PasswordInput";
import PasswordRequisitos, { passwordValido } from "@/components/PasswordRequisitos";
import { createClient } from "@/lib/supabase";

const inputCls = "w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors";
const onF = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#f9b23b");
const onB = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "#f3f4f6");

export default function NuevaPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) { setError("Las contraseñas no coinciden."); return; }
    setError("");
    setLoading(true);
    // El usuario llega con una sesión de recuperación (establecida vía /auth/callback).
    const { error: updErr } = await supabase.auth.updateUser({ password: nueva });
    if (updErr) {
      setError("El enlace no es válido o ha caducado. Solicita uno nuevo desde 'Recuperar contraseña'.");
      setLoading(false);
      return;
    }
    setOk(true);
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6"><Logo size="md" /></div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Nueva contraseña</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Elige una contraseña segura para tu cuenta.</p>

        {ok ? (
          <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f0f7e6" }}>
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-gray-700">Contraseña actualizada. Redirigiendo al inicio de sesión…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nueva contraseña</label>
              <PasswordInput value={nueva} onChange={setNueva} placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password" className={inputCls} onFocus={onF} onBlur={onB} />
              <PasswordRequisitos value={nueva} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirmar contraseña</label>
              <PasswordInput value={confirmar} onChange={setConfirmar} required autoComplete="new-password" className={inputCls} onFocus={onF} onBlur={onB} />
            </div>
            {error && (
              <div className="rounded-xl p-3 bg-red-50 border border-red-100">
                <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !passwordValido(nueva) || nueva !== confirmar}
              className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando...</span> : "Cambiar contraseña"}
            </button>
            <p className="text-center text-xs text-gray-400 pt-1">
              <Link href="/reset-password" className="font-semibold" style={{ color: "#93bf30" }}>Solicitar un enlace nuevo</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
