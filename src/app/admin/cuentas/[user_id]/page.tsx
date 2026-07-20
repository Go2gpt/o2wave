import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import VerificacionActions from "../../verificaciones/actions";
import CuentaAcciones from "./acciones";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = { ong_pequena: "ONG pequeña", ong_mediana: "ONG mediana", ong: "ONG", empresa: "Empresa" };
const PLAN_LABEL: Record<string, string> = { ong_pequena: "Gratuito", ong_mediana: "ONG mediana", earlybird: "Early Bird", standard: "Standard", pro: "Pro" };

interface Perfil {
  id: string; email: string | null; nombre_entidad: string | null; tipo_entidad: string | null;
  plan_actual: string | null; plan_estado: string | null; plan_periodo_fin: string | null;
  estado_verificacion: string | null; verification_notes: string | null; motivo_rechazo: string | null;
  cuenta_suspendida: boolean | null; acepta_mencion_go2: boolean | null; es_embajador: boolean | null;
  nif: string | null; presupuesto_anual: number | null; trabajadores_remunerados: number | null;
  sector: string | null; created_at: string | null; stripe_subscription_id: string | null;
}

function fecha(s: string | null) {
  return s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function AdminCuentaDetallePage({ params }: { params: { user_id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caller } = await supabase.from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select(
    "id, email, nombre_entidad, tipo_entidad, plan_actual, plan_estado, plan_periodo_fin, estado_verificacion, verification_notes, motivo_rechazo, cuenta_suspendida, acepta_mencion_go2, es_embajador, nif, presupuesto_anual, trabajadores_remunerados, sector, created_at, stripe_subscription_id"
  ).eq("id", params.user_id).single<Perfil>();
  if (!p) notFound();

  // Actividad: posts este mes, último post, documentos subidos, último login.
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const { count: postsMes } = await admin.from("generated_posts")
    .select("id", { count: "exact", head: true }).eq("user_id", p.id).gte("created_at", inicioMes.toISOString());
  const { data: ultimoPost } = await admin.from("generated_posts")
    .select("created_at, red_social, tema").eq("user_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let numDocs = 0;
  try {
    const { data: docs } = await admin.storage.from("verification-docs").list(p.id, { limit: 100 });
    numDocs = (docs ?? []).filter((f) => f.name && f.name !== ".emptyFolderPlaceholder").length;
  } catch { /* no crítico */ }
  let ultimoLogin: string | null = null;
  try { const { data: au } = await admin.auth.admin.getUserById(p.id); ultimoLogin = au?.user?.last_sign_in_at ?? null; } catch { /* noop */ }

  const esOng = (p.tipo_entidad || "").startsWith("ong");
  const Dato = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-white/5">
      <span className="text-white/40 text-xs">{k}</span>
      <span className="text-sm text-right">{v ?? "—"}</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-4 sm:px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <BackLink href="/admin/cuentas" dark>Cuentas</BackLink>
          <div className="mt-3"><Logo size="md" /></div>
          <div className="flex items-center gap-2 mt-4">
            <h1 className="text-xl font-semibold">{p.nombre_entidad || p.email || "—"}</h1>
            {p.es_embajador && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(249,178,59,0.15)", color: "#f9b23b" }}>Embajador ★</span>}
            {p.cuenta_suspendida && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(220,39,67,0.15)", color: "#f87171" }}>Suspendida</span>}
          </div>
          <p className="text-sm text-white/50">{p.email}</p>
        </div>

        {/* Datos del perfil */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Perfil</h2>
          <Dato k="Tipo" v={TIPO_LABEL[p.tipo_entidad || ""] || p.tipo_entidad} />
          <Dato k="CIF" v={p.nif} />
          <Dato k="Sector" v={p.sector} />
          <Dato k="Presupuesto" v={p.presupuesto_anual != null ? `${p.presupuesto_anual.toLocaleString("es-ES")} €` : "no declarado"} />
          <Dato k="Trabajadores" v={p.trabajadores_remunerados != null ? p.trabajadores_remunerados : "no declarado"} />
          <Dato k="Alta" v={fecha(p.created_at)} />
          <Dato k="Último login" v={fecha(ultimoLogin)} />
        </section>

        {/* Suscripción */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Suscripción</h2>
          <Dato k="Plan" v={PLAN_LABEL[p.plan_actual || ""] || p.plan_actual} />
          <Dato k="Estado" v={p.plan_estado || "—"} />
          <Dato k="Próximo cobro" v={fecha(p.plan_periodo_fin)} />
          <Dato k="Suscripción Stripe" v={p.stripe_subscription_id ? "Sí" : "No"} />
          <Dato k="Embajador (pro sin cobro)" v={p.es_embajador ? "Sí ★" : "No"} />
          <Dato k="Descuento mención Go2" v={p.acepta_mencion_go2 ? "10% activo" : "No"} />
        </section>

        {/* Actividad */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Actividad</h2>
          <Dato k="Posts este mes" v={postsMes ?? 0} />
          <Dato k="Último post" v={ultimoPost ? `${ultimoPost.red_social} · ${fecha(ultimoPost.created_at)}` : "—"} />
          <Dato k="Documentos subidos" v={numDocs} />
        </section>

        {/* Verificación (solo ONG) */}
        {esOng && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Verificación</h2>
            <p className="text-sm text-white/60 mb-1">Estado actual: <strong>{p.estado_verificacion || "—"}</strong></p>
            {p.motivo_rechazo && <p className="text-xs text-white/50 mb-1 border-l-2 border-[#f9b23b] pl-2">{p.motivo_rechazo}</p>}
            <VerificacionActions userId={p.id} initialNotas={p.verification_notes} />
          </section>
        )}

        {/* Acciones */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Acciones</h2>
          <CuentaAcciones userId={p.id} suspendida={!!p.cuenta_suspendida} esEmbajador={!!p.es_embajador} tieneSubActiva={!!p.stripe_subscription_id && p.plan_estado === "activa"} />
        </section>
      </div>
    </main>
  );
}
