import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const PLANES = [
  {
    id: "free",
    name: "Gratis",
    price: "0",
    icon: "🆓",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    features: ["5 posts/mes", "Instagram y Facebook", "Texto con IA", "Historial 7 días"],
    missing: ["Imágenes con IA", "TikTok", "PDF semanal", "Días clave", "Soporte prioritario"],
  },
  {
    id: "basico",
    name: "Básico",
    price: "9",
    icon: "🌱",
    color: "#93bf30",
    bg: "#f0f7e6",
    border: "#93bf30",
    badge: "Solidario ONGs",
    features: ["30 posts/mes", "Todas las redes", "Texto + imágenes IA", "TikTok scripts", "Historial completo", "Días clave"],
    missing: ["PDF semanal", "Soporte prioritario"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "19",
    icon: "⚡",
    color: "#f9b23b",
    bg: "#fff8ef",
    border: "#f9b23b",
    badge: "Más popular",
    highlight: true,
    features: ["Posts ilimitados", "Todas las redes", "Texto + imágenes IA", "TikTok scripts", "PDF semanal automático", "Días clave personalizados", "Análisis web IA", "Soporte prioritario"],
    missing: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "49",
    icon: "🚀",
    color: "#6366f1",
    bg: "#eef2ff",
    border: "#6366f1",
    features: ["Todo de Pro", "Múltiples entidades", "API access", "Onboarding personalizado", "Account manager", "SLA garantizado"],
    missing: [],
  },
];

export default async function PlansPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/welcome");

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", session.user.id).single();
  const currentPlan = profile?.plan || "free";

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Planes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Elige el que mejor se adapta a tu organización</p>
      </div>

      {/* Solidarity badge */}
      <div className="mx-5 my-4 rounded-2xl p-3 flex items-center gap-3"
        style={{ backgroundColor: "#f0f7e6", border: "1px solid rgba(147,191,48,0.3)" }}>
        <span>💚</span>
        <p className="text-xs text-gray-600">
          <strong style={{ color: "#93bf30" }}>Precios solidarios para el tercer sector.</strong>{" "}
          Las ONGs acceden al plan Básico por 9€/mes.
        </p>
      </div>

      <div className="px-5 space-y-3 pb-4">
        {PLANES.map(plan => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id} className="bg-white rounded-2xl overflow-hidden shadow-sm"
              style={{ border: `2px solid ${isCurrent || plan.highlight ? plan.border : "#e5e7eb"}` }}>
              {(plan.badge || isCurrent) && (
                <div className="px-4 py-2 text-center text-[11px] font-bold"
                  style={{ backgroundColor: isCurrent ? "#f9b23b" : plan.bg, color: isCurrent ? "#fff" : plan.color }}>
                  {isCurrent ? "✓ Tu plan actual" : plan.badge}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{plan.icon}</span>
                    <div>
                      <p className="font-black text-gray-900">{plan.name}</p>
                      {plan.id === "basico" && <p className="text-[10px] text-gray-400">para ONGs y autónomos</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: plan.color }}>{plan.price}€</p>
                    <p className="text-[10px] text-gray-400">/mes</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: plan.color }}>✓</span>
                      <span className="text-xs text-gray-600">{f}</span>
                    </div>
                  ))}
                  {plan.missing.map(f => (
                    <div key={f} className="flex items-center gap-2 opacity-40">
                      <span className="text-xs text-gray-400">✗</span>
                      <span className="text-xs text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>

                {!isCurrent && plan.id !== "free" && (
                  <button className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98]"
                    style={{ backgroundColor: plan.color }}>
                    Cambiar a {plan.name}
                  </button>
                )}
                {isCurrent && (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold"
                    style={{ backgroundColor: plan.bg, color: plan.color }}>
                    Plan activo
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-4 text-center">
        <p className="text-xs text-gray-400">
          Todos los planes incluyen cancelación en cualquier momento.{" "}
          <Link href="/dashboard" className="font-semibold" style={{ color: "#f9b23b" }}>Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
