import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import VerificacionActions from "./actions";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  ong: "ONG",
  ong_pequena: "ONG pequeña",
  ong_mediana: "ONG mediana",
  empresa: "Empresa",
};

// Estados de verificación + presentación del badge.
const ESTADOS: Record<string, { label: string; bg: string; fg: string }> = {
  pendiente:     { label: "Pendiente",   bg: "rgba(249,178,59,0.15)",  fg: "#f9b23b" },
  verificada:    { label: "Aprobada",    bg: "rgba(147,191,48,0.15)",  fg: "#93bf30" },
  rechazada:     { label: "Rechazada",   bg: "rgba(220,39,67,0.15)",   fg: "#f87171" },
  necesita_info: { label: "Pide info",   bg: "rgba(59,130,246,0.15)",  fg: "#60a5fa" },
};

// Pestañas de filtro (orden de aparición).
const FILTROS: { key: string; label: string }[] = [
  { key: "pendiente", label: "Pendientes" },
  { key: "necesita_info", label: "Pide info" },
  { key: "verificada", label: "Aprobadas" },
  { key: "rechazada", label: "Rechazadas" },
  { key: "todas", label: "Todas" },
];

interface PerfilVerif {
  id: string;
  email: string;
  nombre_entidad: string | null;
  tipo_entidad: string | null;
  nif: string | null;
  presupuesto_anual: number | null;
  trabajadores_remunerados: number | null;
  plan_actual: string | null;
  estado_verificacion: string | null;
  motivo_rechazo: string | null;
  verification_notes: string | null;
  documento_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default async function AdminVerificacionesPage({ searchParams }: { searchParams?: { estado?: string } }) {
  // 1) Auth + comprobación de admin (sesión por cookies, RLS permite ver el propio perfil)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caller } = await supabase
    .from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  const estado = searchParams?.estado && (ESTADOS[searchParams.estado] || searchParams.estado === "todas")
    ? searchParams.estado
    : "pendiente";

  // 2) Listado (service role: omite RLS). Solo ONGs (la verificación es para
  //    acreditar la condición de entidad sin ánimo de lucro).
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, nombre_entidad, tipo_entidad, nif, presupuesto_anual, trabajadores_remunerados, plan_actual, estado_verificacion, motivo_rechazo, verification_notes, documento_url, created_at, updated_at")
    .in("tipo_entidad", ["ong", "ong_pequena", "ong_mediana"])
    .order("updated_at", { ascending: true });
  if (estado !== "todas") query = query.eq("estado_verificacion", estado);
  const { data: perfiles } = await query.returns<PerfilVerif[]>();

  // 3) Documentos: listamos la carpeta verification-docs/<id>/ (varios archivos)
  //    y firmamos cada uno (1 h). Fallback al documento_url heredado.
  const filas = await Promise.all(
    (perfiles ?? []).map(async (p) => {
      const docs: { nombre: string; url: string }[] = [];
      const { data: archivos } = await admin.storage.from("verification-docs").list(p.id, { limit: 100 });
      for (const f of archivos ?? []) {
        if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
        const { data: signed } = await admin.storage.from("verification-docs").createSignedUrl(`${p.id}/${f.name}`, 3600);
        if (signed?.signedUrl) docs.push({ nombre: f.name, url: signed.signedUrl });
      }
      if (docs.length === 0 && p.documento_url) {
        const { data: signed } = await admin.storage.from("verification-docs").createSignedUrl(p.documento_url, 3600);
        if (signed?.signedUrl) docs.push({ nombre: "documento", url: signed.signedUrl });
      }
      return { ...p, docs };
    })
  );

  const fmtFecha = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <BackLink href="/admin" dark>Administración</BackLink>
          <div className="mt-3"><Logo size="md" /></div>
          <h1 className="text-xl font-semibold mt-4">Verificación de ONGs</h1>
          <p className="text-sm text-white/50 mt-1">
            {filas.length} {filas.length === 1 ? "organización" : "organizaciones"} en esta vista.
          </p>
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTROS.map((f) => {
            const activo = estado === f.key;
            return (
              <Link key={f.key} href={`/admin/verificaciones?estado=${f.key}`}
                className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                style={activo
                  ? { backgroundColor: "#f9b23b", color: "#0F0F0F", borderColor: "#f9b23b" }
                  : { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" }}>
                {f.label}
              </Link>
            );
          })}
        </div>

        {filas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold">Nada por aquí</p>
            <p className="text-sm text-white/50 mt-1">No hay organizaciones en este estado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filas.map((p) => {
              const est = ESTADOS[p.estado_verificacion || ""] || { label: p.estado_verificacion || "—", bg: "rgba(255,255,255,0.1)", fg: "#fff" };
              return (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{p.nombre_entidad || p.email}</p>
                      <p className="text-xs text-white/50 truncate">{p.email}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: est.bg, color: est.fg }}>
                      {est.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-white/60 mb-3">
                    <div><span className="text-white/40">CIF:</span> {p.nif || "—"}</div>
                    <div><span className="text-white/40">Plan:</span> {TIPO_LABEL[p.plan_actual || ""] || p.plan_actual || "—"}</div>
                    <div><span className="text-white/40">Presupuesto:</span> {p.presupuesto_anual != null ? `${p.presupuesto_anual.toLocaleString("es-ES")} €` : "no declarado"}</div>
                    <div><span className="text-white/40">Trabajadores:</span> {p.trabajadores_remunerados != null ? p.trabajadores_remunerados : "no declarado"}</div>
                    <div><span className="text-white/40">Registro:</span> {fmtFecha(p.created_at)}</div>
                    <div><span className="text-white/40">Actualizado:</span> {fmtFecha(p.updated_at)}</div>
                  </div>

                  {p.motivo_rechazo && (p.estado_verificacion === "rechazada" || p.estado_verificacion === "necesita_info") && (
                    <div className="text-xs text-white/60 mb-3 border-l-2 border-[#f9b23b] pl-2.5">
                      <span className="text-white/40">{p.estado_verificacion === "rechazada" ? "Motivo:" : "Aclaración pedida:"}</span> {p.motivo_rechazo}
                    </div>
                  )}

                  {p.docs.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {p.docs.map((d, i) => (
                        <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f9b23b] hover:underline">
                          📄 {d.nombre}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-white/40">Sin documentos subidos</span>
                  )}

                  <VerificacionActions userId={p.id} initialNotas={p.verification_notes} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
