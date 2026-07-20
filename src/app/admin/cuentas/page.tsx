import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const TIPOS = [
  { key: "todos", label: "Todos" },
  { key: "ong_pequena", label: "ONG pequeña" },
  { key: "ong_mediana", label: "ONG mediana" },
  { key: "empresa", label: "Empresa" },
];
const ESTADOS = [
  { key: "todos", label: "Todos" },
  { key: "verificada", label: "Verificada" },
  { key: "pendiente", label: "Pendiente" },
  { key: "rechazada", label: "Rechazada" },
  { key: "suspendida", label: "Suspendida" },
];
const PLANES = [
  { key: "todos", label: "Todos" },
  { key: "ong_pequena", label: "Gratuito" },
  { key: "earlybird", label: "Early Bird" },
  { key: "standard", label: "Standard" },
  { key: "pro", label: "Pro" },
];
const ORDENES = [
  { key: "recientes", label: "Más recientes" },
  { key: "renovar", label: "Próximas a renovar" },
  { key: "alfabetico", label: "Alfabético" },
];

const TIPO_LABEL: Record<string, string> = { ong_pequena: "ONG peq.", ong_mediana: "ONG med.", ong: "ONG", empresa: "Empresa" };
const PLAN_LABEL: Record<string, string> = { ong_pequena: "Gratuito", ong_mediana: "ONG mediana", earlybird: "Early Bird", standard: "Standard", pro: "Pro" };

interface Cuenta {
  id: string;
  email: string | null;
  nombre_entidad: string | null;
  tipo_entidad: string | null;
  plan_actual: string | null;
  estado_verificacion: string | null;
  cuenta_suspendida: boolean | null;
  es_embajador: boolean | null;
  created_at: string | null;
  plan_periodo_fin: string | null;
}

function badge(estado: string | null, suspendida: boolean | null) {
  if (suspendida) return { txt: "Suspendida", bg: "rgba(220,39,67,0.15)", fg: "#f87171" };
  const m: Record<string, { txt: string; bg: string; fg: string }> = {
    verificada: { txt: "Verificada", bg: "rgba(147,191,48,0.15)", fg: "#93bf30" },
    pendiente: { txt: "Pendiente", bg: "rgba(249,178,59,0.15)", fg: "#f9b23b" },
    rechazada: { txt: "Rechazada", bg: "rgba(220,39,67,0.15)", fg: "#f87171" },
    necesita_info: { txt: "Pide info", bg: "rgba(59,130,246,0.15)", fg: "#60a5fa" },
  };
  return m[estado || ""] || { txt: estado || "—", bg: "rgba(255,255,255,0.1)", fg: "#fff" };
}

function fecha(s: string | null) {
  return s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function AdminCuentasPage({ searchParams }: {
  searchParams?: { tipo?: string; estado?: string; plan?: string; q?: string; sort?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caller } = await supabase.from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  const tipo = searchParams?.tipo || "todos";
  const estado = searchParams?.estado || "todos";
  const plan = searchParams?.plan || "todos";
  const q = (searchParams?.q || "").trim();
  const sort = searchParams?.sort || "recientes";
  const page = Math.max(0, parseInt(searchParams?.page || "0", 10) || 0);

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, nombre_entidad, tipo_entidad, plan_actual, estado_verificacion, cuenta_suspendida, es_embajador, created_at, plan_periodo_fin", { count: "exact" });

  if (tipo !== "todos") query = query.eq("tipo_entidad", tipo);
  if (plan !== "todos") query = query.eq("plan_actual", plan);
  if (estado === "suspendida") query = query.eq("cuenta_suspendida", true);
  else if (estado !== "todos") query = query.eq("estado_verificacion", estado);
  if (q) query = query.or(`email.ilike.%${q}%,nombre_entidad.ilike.%${q}%`);

  if (sort === "alfabetico") query = query.order("nombre_entidad", { ascending: true, nullsFirst: false });
  else if (sort === "renovar") query = query.order("plan_periodo_fin", { ascending: true, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  const { data: cuentas, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1).returns<Cuenta[]>();
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Último login: lo trae auth.admin.listUsers (map id → last_sign_in_at).
  const ultimoLogin = new Map<string, string>();
  try {
    const { data: lu } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of lu?.users ?? []) if (u.last_sign_in_at) ultimoLogin.set(u.id, u.last_sign_in_at);
  } catch { /* no crítico */ }

  // Construye una URL de filtro conservando el resto de params.
  const params = { tipo, estado, plan, q, sort };
  const url = (over: Partial<typeof params> & { page?: number }) => {
    const p = new URLSearchParams();
    const merged = { ...params, ...over };
    if (merged.tipo !== "todos") p.set("tipo", merged.tipo);
    if (merged.estado !== "todos") p.set("estado", merged.estado);
    if (merged.plan !== "todos") p.set("plan", merged.plan);
    if (merged.q) p.set("q", merged.q);
    if (merged.sort !== "recientes") p.set("sort", merged.sort);
    if (over.page) p.set("page", String(over.page));
    const s = p.toString();
    return `/admin/cuentas${s ? `?${s}` : ""}`;
  };

  const chip = (activo: boolean) =>
    `text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${activo ? "" : "hover:bg-white/5"}`;
  const chipStyle = (activo: boolean): React.CSSProperties =>
    activo ? { backgroundColor: "#f9b23b", color: "#0F0F0F", borderColor: "#f9b23b" }
      : { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" };

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-4 sm:px-5 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <BackLink href="/admin" dark>Administración</BackLink>
          <div className="mt-3"><Logo size="md" /></div>
          <h1 className="text-xl font-semibold mt-4">Gestión de cuentas</h1>
          <p className="text-sm text-white/50 mt-1">{total} {total === 1 ? "cuenta" : "cuentas"}.</p>
        </div>

        {/* Buscador (GET) */}
        <form action="/admin/cuentas" method="get" className="mb-4">
          {tipo !== "todos" && <input type="hidden" name="tipo" value={tipo} />}
          {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
          {plan !== "todos" && <input type="hidden" name="plan" value={plan} />}
          {sort !== "recientes" && <input type="hidden" name="sort" value={sort} />}
          <input name="q" defaultValue={q} placeholder="Buscar por email o nombre…"
            className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#f9b23b]" />
        </form>

        {/* Filtros */}
        <div className="space-y-2 mb-5">
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map((t) => <Link key={t.key} href={url({ tipo: t.key, page: undefined })} className={chip(tipo === t.key)} style={chipStyle(tipo === t.key)}>{t.label}</Link>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS.map((e) => <Link key={e.key} href={url({ estado: e.key, page: undefined })} className={chip(estado === e.key)} style={chipStyle(estado === e.key)}>{e.label}</Link>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PLANES.map((p) => <Link key={p.key} href={url({ plan: p.key, page: undefined })} className={chip(plan === p.key)} style={chipStyle(plan === p.key)}>{p.label}</Link>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-white/40 mr-1">Orden:</span>
            {ORDENES.map((o) => <Link key={o.key} href={url({ sort: o.key, page: undefined })} className={chip(sort === o.key)} style={chipStyle(sort === o.key)}>{o.label}</Link>)}
          </div>
        </div>

        {(cuentas ?? []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/50">No hay cuentas con estos filtros.</div>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <div className="space-y-3 md:hidden">
              {(cuentas ?? []).map((c) => {
                const b = badge(c.estado_verificacion, c.cuenta_suspendida);
                return (
                  <Link key={c.id} href={`/admin/cuentas/${c.id}`} className="block rounded-2xl border border-white/10 bg-white/5 p-4 active:bg-white/10">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-bold truncate">{c.es_embajador && <span title="Embajador">★ </span>}{c.nombre_entidad || c.email || "—"}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.bg, color: b.fg }}>{b.txt}</span>
                    </div>
                    <p className="text-xs text-white/50 truncate mb-2">{c.email}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/50">
                      <span>{TIPO_LABEL[c.tipo_entidad || ""] || c.tipo_entidad || "—"}</span>
                      <span>· {PLAN_LABEL[c.plan_actual || ""] || c.plan_actual || "—"}</span>
                      <span>· alta {fecha(c.created_at)}</span>
                      <span>· últ. login {fecha(ultimoLogin.get(c.id) || null)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/50 text-xs">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Entidad</th>
                    <th className="text-left font-semibold px-4 py-2.5">Tipo</th>
                    <th className="text-left font-semibold px-4 py-2.5">Plan</th>
                    <th className="text-left font-semibold px-4 py-2.5">Estado</th>
                    <th className="text-left font-semibold px-4 py-2.5">Alta</th>
                    <th className="text-left font-semibold px-4 py-2.5">Últ. login</th>
                  </tr>
                </thead>
                <tbody>
                  {(cuentas ?? []).map((c) => {
                    const b = badge(c.estado_verificacion, c.cuenta_suspendida);
                    return (
                      <tr key={c.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-2.5">
                          <Link href={`/admin/cuentas/${c.id}`} className="block">
                            <span className="font-semibold">{c.es_embajador && <span title="Embajador" style={{ color: "#f9b23b" }}>★ </span>}{c.nombre_entidad || "—"}</span>
                            <span className="block text-xs text-white/40">{c.email}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-white/60">{TIPO_LABEL[c.tipo_entidad || ""] || c.tipo_entidad || "—"}</td>
                        <td className="px-4 py-2.5 text-white/60">{PLAN_LABEL[c.plan_actual || ""] || c.plan_actual || "—"}</td>
                        <td className="px-4 py-2.5"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: b.bg, color: b.fg }}>{b.txt}</span></td>
                        <td className="px-4 py-2.5 text-white/50">{fecha(c.created_at)}</td>
                        <td className="px-4 py-2.5 text-white/50">{fecha(ultimoLogin.get(c.id) || null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 text-sm">
            {page > 0
              ? <Link href={url({ page: page - 1 })} className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5">← Anterior</Link>
              : <span />}
            <span className="text-white/40 text-xs">Página {page + 1} de {totalPages}</span>
            {page + 1 < totalPages
              ? <Link href={url({ page: page + 1 })} className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5">Siguiente →</Link>
              : <span />}
          </div>
        )}
      </div>
    </main>
  );
}
