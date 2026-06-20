"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase";
import { normalizarNIF, detectarTipoDocumento, validarDocumento } from "@/lib/nif";
import { guardarPlanPendiente } from "@/lib/checkoutRedirect";
import PasswordInput from "@/components/PasswordInput";
import PasswordRequisitos, { passwordValido } from "@/components/PasswordRequisitos";

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

// Mapea el plan elegido en /plans al tipo de entidad del registro.
const PLAN_A_TIPO: Record<string, string> = {
  ong_pequena: "ong_pequena",
  ong_mediana: "ong_mediana",
  earlybird: "empresa",
  standard: "empresa",
  pro: "empresa",
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState<string>("ong_pequena");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nif, setNif] = useState("");
  const [nifError, setNifError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [aceptaGratis, setAceptaGratis] = useState(false);

  // Preselecciona el tipo según ?plan= (viene de /plans) y guarda el plan/ciclo
  // de pago pendiente para retomar el checkout tras el onboarding. Fallback: ong_pequena.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    const tipoMapeado = plan ? PLAN_A_TIPO[plan] : undefined;
    if (tipoMapeado) setTipo(tipoMapeado);
    guardarPlanPendiente(plan, params.get("ciclo"));
  }, []);

  // Todos los tipos aportan documento de identificación.
  const pideNif = true;
  const DUP_MSG = "Este NIF ya está registrado en o2Wave. Si crees que es un error, contacta con nosotros.";

  const esErrorNifDuplicado = (msg: string) =>
    msg.includes("23505") || msg.toLowerCase().includes("nif");

  const esGratisPlan = tipo === "ong_pequena";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNifError("");

    // Plan gratuito: la declaración de cumplimiento es obligatoria.
    if (esGratisPlan && !aceptaGratis) {
      setError("Para continuar con el plan gratuito, marca la declaración de cumplimiento.");
      return;
    }
    const fechaAcept = esGratisPlan && aceptaGratis ? new Date().toISOString() : null;

    let nifNorm: string | null = null;
    let tipoDoc: string | null = null;
    if (pideNif) {
      // ONG gratuita → solo CIF sin ánimo de lucro; resto → CIF/DNI/NIE/Pasaporte.
      const v = validarDocumento(nif, esGratisPlan);
      if (!v.valido) { setNifError(v.mensaje || "Documento no válido"); return; }
      nifNorm = normalizarNIF(nif);
      tipoDoc = v.tipo ?? null;
    }

    setLoading(true);
    try {
      // Pre-chequeo de unicidad (amigable). RPC SECURITY DEFINER que ignora
      // RLS; la constraint UNIQUE queda como red de seguridad.
      if (nifNorm) {
        const { data: existe } = await supabase.rpc("nif_existe", { p_nif: nifNorm });
        if (existe === true) { setNifError(DUP_MSG); setLoading(false); return; }
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // La aceptación viaja en metadata para sobrevivir a la confirmación por
          // email (el trigger handle_new_user la copia al perfil).
          data: {
            tipo_entidad: tipo,
            nif: nifNorm,
            tipo_documento: tipoDoc,
            acepto_condiciones_plan_gratuito: esGratisPlan ? aceptaGratis : false,
            fecha_aceptacion_plan_gratuito: fechaAcept,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/web`,
        },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is disabled, a session is returned immediately
      // and we can go straight into onboarding. Otherwise, prompt the user to
      // confirm via the email link (which lands on /auth/callback).
      if (data.session) {
        const { error: upErr } = await supabase.from("profiles").upsert({
          id: data.session.user.id,
          email,
          tipo_entidad: tipo,
          nif: nifNorm,
          plan: "free",
          acepto_condiciones_plan_gratuito: esGratisPlan ? aceptaGratis : false,
          fecha_aceptacion_plan_gratuito: fechaAcept,
        });
        if (upErr) {
          if (esErrorNifDuplicado(`${upErr.code} ${upErr.message}`)) { setNifError(DUP_MSG); return; }
          throw upErr;
        }
        // tipo_documento: best-effort (no rompe el registro si la columna no existe aún).
        if (tipoDoc) await supabase.from("profiles").update({ tipo_documento: tipoDoc }).eq("id", data.session.user.id).then(() => {}, () => {});
        router.push("/onboarding/web");
      } else {
        setEmailSent(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Red de seguridad: si la constraint salta (trigger crea el profile),
      // el signUp falla; mostramos mensaje de duplicado si lo detectamos.
      if (esErrorNifDuplicado(msg)) setNifError(DUP_MSG);
      else setError(err instanceof Error ? err.message : "Error al registrarse");
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

        {/* Plan gratuito: condiciones + declaración obligatoria (solo ONG pequeña) */}
        {esGratisPlan && (
          <div className="mb-4 rounded-2xl p-4" style={{ border: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
            <p className="text-xs font-semibold text-gray-700 mb-2">El plan gratuito está disponible para entidades sin ánimo de lucro con:</p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 mb-3">
              <li>CIF que empieza por G, R, V o N.</li>
              <li>Presupuesto anual inferior a 50.000 €.</li>
              <li>Máximo 1 trabajador remunerado.</li>
              <li>Acceso a 10 publicaciones al mes (Instagram y Facebook).</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceptaGratis} onChange={(e) => setAceptaGratis(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: "#93bf30" }} />
              <span className="text-xs text-gray-600 leading-relaxed">
                Declaro que mi entidad cumple los requisitos del plan gratuito y acepto las condiciones descritas en la sección 5 de los Términos de uso.{" "}
                <a href="/terminos#plan-gratuito" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "#93bf30" }}>Ver condiciones completas →</a>
              </span>
            </label>
          </div>
        )}

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
              placeholder="tu@email.com" required
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selectedColor}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Contraseña
            </label>
            <PasswordInput value={password} onChange={setPassword}
              placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = selectedColor}
              onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
            <PasswordRequisitos value={password} />
          </div>

          {pideNif && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {esGratisPlan ? "CIF de la entidad" : "Documento de identificación (NIF / DNI / NIE / Pasaporte)"}
              </label>
              <input type="text" value={nif} onChange={e => { setNif(e.target.value.toUpperCase()); setNifError(""); }}
                placeholder={esGratisPlan ? "Ej: G12345678" : "Ej: G12345678 / 12345678A / X1234567A / Z1234567"} required
                className="w-full border-2 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                style={{ borderColor: nifError ? "#f9b23b" : "#f3f4f6" }}
                onFocus={e => e.target.style.borderColor = nifError ? "#f9b23b" : selectedColor}
                onBlur={e => {
                  // Feedback inmediato: valida al salir del campo (si hay algo escrito).
                  if (nif.trim()) {
                    const v = validarDocumento(nif, esGratisPlan);
                    setNifError(v.valido ? "" : (v.mensaje || "Documento no válido"));
                    e.target.style.borderColor = v.valido ? "#f3f4f6" : "#f9b23b";
                  } else {
                    e.target.style.borderColor = "#f3f4f6";
                  }
                }} />
              {nifError ? (
                <p className="text-[11px] font-medium mt-1.5" style={{ color: "#f9b23b" }}>⚠️ {nifError}</p>
              ) : nif.trim() && detectarTipoDocumento(nif) !== "INVALIDO" ? (
                <p className="text-[11px] font-medium mt-1.5" style={{ color: "#93bf30" }}>✓ {detectarTipoDocumento(nif)} detectado</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {esGratisPlan ? "Necesario para verificar tu entidad sin ánimo de lucro." : "Necesario para emisión de facturas correctas."}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Al crear la cuenta aceptas nuestros{" "}
            <Link href="/terminos" className="underline font-medium">Términos de uso</Link> y{" "}
            <Link href="/privacidad" className="underline font-medium">Política de privacidad</Link>.
          </p>

          <button type="submit" disabled={loading || !passwordValido(password) || (esGratisPlan && !aceptaGratis)}
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
