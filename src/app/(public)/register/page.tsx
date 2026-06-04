"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";

const PLANES = [
  {
    id: "ong",
    label: "ONG / Asociación",
    emoji: "🤝",
    precio: "9",
    desc: "Sin ánimo de lucro",
    color: "#93bf30",
    bg: "#f0f7e6",
  },
  {
    id: "autonomo",
    label: "Autónomo / Freelance",
    emoji: "💼",
    precio: "14",
    desc: "Profesional independiente",
    color: "#f9b23b",
    bg: "#fff8ef",
  },
  {
    id: "pyme",
    label: "PYME / Empresa",
    emoji: "🏢",
    precio: "19",
    desc: "Pequeña o mediana empresa",
    color: "#6366f1",
    bg: "#eef2ff",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState<string>("ong");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { tipo_entidad: tipo },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/web`,
        },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is disabled, a session is returned immediately
      // and we can go straight into onboarding. Otherwise, prompt the user to
      // confirm via the email link (which lands on /auth/callback).
      if (data.session) {
        await supabase.from("profiles").upsert({
          id: data.session.user.id,
          email,
          tipo_entidad: tipo,
          plan: "free",
        });
        router.push("/onboarding/web");
      } else {
        setEmailSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const selected = PLANES.find(p => p.id === tipo)!;

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6"
          style={{ backgroundColor: "#f0f7e6" }}>📩</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
        <p className="text-sm text-gray-500 mb-1">Hemos enviado un enlace de confirmación a</p>
        <p className="text-sm font-semibold text-gray-800 mb-6">{email}</p>
        <p className="text-xs text-gray-400 max-w-xs mb-8">
          Pulsa el enlace del email para activar tu cuenta y continuar con la configuración.
        </p>
        <Link href="/login"
          className="px-6 py-3 rounded-2xl font-semibold text-sm border-2 border-gray-200 text-gray-600">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link href="/welcome" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <Logo size="md" />
      </div>

      <div className="flex-1 px-5 pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mb-6">Elige tu tipo de entidad</p>

        {/* Plan selector */}
        <div className="space-y-2.5 mb-6">
          {PLANES.map((plan) => (
            <button key={plan.id} type="button" onClick={() => setTipo(plan.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left"
              style={tipo === plan.id
                ? { borderColor: plan.color, backgroundColor: plan.bg }
                : { borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
              <span className="text-2xl">{plan.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: tipo === plan.id ? plan.color : "#374151" }}>
                  {plan.label}
                </p>
                <p className="text-xs text-gray-400">{plan.desc}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg" style={{ color: tipo === plan.id ? plan.color : "#374151" }}>
                  {plan.precio}€
                </p>
                <p className="text-[10px] text-gray-400">/mes</p>
              </div>
            </button>
          ))}
        </div>

        {/* Solidarity message for ONG */}
        {tipo === "ong" && (
          <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
            style={{ backgroundColor: "#f0f7e6", border: "1px solid rgba(147,191,48,0.3)" }}>
            <span className="text-lg">💚</span>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong style={{ color: "#93bf30" }}>Precio solidario para el tercer sector.</strong>{" "}
              Porque las organizaciones que cambian el mundo merecen las mismas herramientas que las grandes empresas.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Correo electrónico
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="hola@tuorganizacion.org" required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selected.color}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Contraseña
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" minLength={8} required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selected.color}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: selected.color }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Creando cuenta...
              </span>
            ) : "Empezar gratis"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "#f9b23b" }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
