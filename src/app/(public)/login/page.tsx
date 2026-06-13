"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase";

function LoginForm() {
  const params = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Solo se acepta una ruta interna (empieza por "/"); nunca una URL externa.
  const rawRedirect = params.get("redirect");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";
  const porInactividad = params.get("reason") === "inactivity";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // Navegación dura: garantiza que el servidor (middleware) reciba las
      // cookies de sesión ya consolidadas antes de procesar el destino,
      // evitando la carrera que mandaba a /onboarding/web por error.
      window.location.assign(redirectTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg === "Invalid login credentials" ? "Email o contraseña incorrectos" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link href="/welcome" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <Logo size="md" />
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8">
        {porInactividad && (
          <div className="rounded-xl p-3 mb-5 flex items-start gap-2"
            style={{ backgroundColor: "#fff8ef", border: "1px solid rgba(249,178,59,0.4)" }}>
            <span>⏱️</span>
            <p className="text-xs font-medium" style={{ color: "#b9791a" }}>
              Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.
            </p>
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h1>
        <p className="text-sm text-gray-500 mb-8">Accede a tu cuenta</p>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="xl" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Correo electrónico
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = "#f9b23b"}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Contraseña
            </label>
            <PasswordInput value={password} onChange={setPassword}
              placeholder="Tu contraseña" required autoComplete="current-password"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = "#f9b23b"}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
            <div className="text-right mt-1.5">
              <Link href="/reset-password" className="text-xs font-semibold" style={{ color: "#93bf30" }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f9b23b" }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Entrando...
              </span>
            ) : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold" style={{ color: "#93bf30" }}>Crear cuenta gratis</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
