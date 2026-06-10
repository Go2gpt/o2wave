"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/siteUrl";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // El enlace pasa por /auth/callback para establecer la sesión de recuperación
    // y luego cae en /reset-password/nueva.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password/nueva`,
    }).catch(() => { /* no revelamos errores: respuesta neutra */ });
    setEnviado(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6"><Logo size="md" /></div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Te enviaremos un enlace para crear una nueva.</p>

        {enviado ? (
          <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f0f7e6" }}>
            <div className="text-3xl mb-2">📬</div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Si existe una cuenta con ese email, te hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja (y el spam).
            </p>
            <Link href="/login" className="inline-block mt-4 text-sm font-semibold" style={{ color: "#93bf30" }}>Volver a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Enviando...</span> : "Enviar enlace"}
            </button>
            <p className="text-center text-xs text-gray-400 pt-1">
              <Link href="/login" className="font-semibold" style={{ color: "#93bf30" }}>Volver a iniciar sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
