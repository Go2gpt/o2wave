"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";

const BLOQUES = [
  {
    titulo: "ONG o entidad social",
    subtitulo: "El precio depende de vuestra capacidad.",
    emoji: "🤝",
    color: "#93bf30",
    bg: "#f0f7e6",
    opciones: [
      { id: "ong_pequena", label: "Pequeña · Gratis" },
      { id: "ong_mediana", label: "Mediana · 9€/mes" },
    ],
  },
  {
    titulo: "Empresa o negocio",
    subtitulo: "Pymes sin equipo de redes.",
    emoji: "🏢",
    color: "#f9b23b",
    bg: "#fff8ef",
    opciones: [
      { id: "empresa", label: "Desde 9€/mes" },
    ],
  },
];

const TIPO_COLOR: Record<string, string> = {
  ong_pequena: "#93bf30",
  ong_mediana: "#93bf30",
  empresa: "#f9b23b",
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState<string>("ong_pequena");
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

  const selectedColor = TIPO_COLOR[tipo] ?? "#f9b23b";

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

        {/* Entity-type selector: two blocks */}
        <div className="space-y-3 mb-4">
          {BLOQUES.map((bloque) => (
            <div key={bloque.titulo} className="rounded-2xl border-2 p-4"
              style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xl">{bloque.emoji}</span>
                <div>
                  <p className="font-bold text-sm text-gray-900">{bloque.titulo}</p>
                  <p className="text-xs text-gray-400">{bloque.subtitulo}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {bloque.opciones.map((op) => (
                  <button key={op.id} type="button" onClick={() => setTipo(op.id)}
                    className="flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all"
                    style={tipo === op.id
                      ? { borderColor: bloque.color, backgroundColor: bloque.bg, color: bloque.color }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Solidarity tagline */}
        <p className="text-center text-xs text-gray-400 mb-6">
          Las que pueden, sostienen a las que no pueden.
        </p>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Correo electrónico
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="hola@tuorganizacion.org" required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selectedColor}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Contraseña
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" minLength={8} required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selectedColor}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: selectedColor }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Creando cuenta...
              </span>
            ) : "Continuar"}
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
