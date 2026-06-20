import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { limpiarMarkdown } from "@/lib/formatText";
import { canUseFeature } from "@/lib/plans";
import { calcularProximos, type DiaClave } from "@/lib/categorias";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import GenerarPackButton from "./GenerarPackButton";
import NovedadesPopup from "@/components/NovedadesPopup";

// URL del roadmap (blog). TODO: confirmar la URL final con Sebas.
const ROADMAP_URL = "https://www.o2wave.app/blog/roadmap";

// El pack se envía LUNES 09:00 (Europa/Madrid). Devuelve el próximo lunes desde
// `desde`; si hoy es lunes, devuelve el de la semana siguiente.
function proximoLunes(desde: Date = new Date()): Date {
  const dia = desde.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const diasHastaLunes = dia === 1 ? 7 : (8 - dia) % 7;
  const next = new Date(desde);
  next.setDate(desde.getDate() + diasHastaLunes);
  next.setHours(9, 0, 0, 0);
  return next;
}

async function deletePost(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const supabase = createClient();
  await supabase.from("generated_posts").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export default async function DashboardPage({ searchParams }: { searchParams: { success?: string } }) {
  const pagoExitoso = searchParams?.success === "1";
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", session.user.id).single();

  const { data: keyDates } = await supabase
    .from("key_dates")
    .select("*")
    .gte("fecha", new Date().toISOString().split("T")[0])
    .order("fecha", { ascending: true })
    .limit(3);

  const { data: recentPosts } = await supabase
    .from("generated_posts")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Saludo neutro: si no hay nombre de entidad, no exponemos el prefijo del email.
  const nombre = profile?.nombre_entidad || "";

  // Logo de la entidad (de brand_identity) para el avatar; si no hay, mostrará iniciales.
  const { data: brand } = await supabase
    .from("brand_identity").select("logo_url").eq("user_id", session.user.id).maybeSingle();
  const avatarProfile = {
    nombre_entidad: profile?.nombre_entidad,
    email: session.user.email,
    logo_url: brand?.logo_url ?? null,
  };

  // Contador de verificaciones pendientes — solo para admins (service role)
  let pendientesAdmin = 0;
  if (profile?.es_admin) {
    const adminCli = createAdminClient();
    const { count } = await adminCli
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("estado_verificacion", "pendiente")
      .not("documento_url", "is", null);
    pendientesAdmin = count ?? 0;
  }

  // Días clave de esta semana (próximos 7 días) para las categorías del usuario
  let eventosSemana = 0;
  const { data: catRows } = await supabase
    .from("categorias_usuario").select("categoria").eq("user_id", session.user.id);
  const catList = (catRows || []).map((c) => c.categoria);
  if (catList.length) {
    const ambitos = profile?.mostrar_dias_espana === false ? ["internacional"] : ["internacional", "espana"];
    const { data: dias } = await supabase
      .from("dias_clave").select("*").in("categoria", catList).in("ambito", ambitos);
    eventosSemana = calcularProximos((dias || []) as DiaClave[]).filter((d) => d.diffDays <= 7).length;
  }
  const subtituloCalendario =
    eventosSemana === 0 ? "No hay eventos esta semana."
    : eventosSemana === 1 ? "1 evento esta semana."
    : `${eventosSemana} eventos esta semana.`;

  const nextDate = keyDates?.[0];
  const daysUntil = nextDate
    ? Math.ceil((new Date(nextDate.fecha).getTime() - Date.now()) / 86400000)
    : null;

  // Panel del pack semanal automático (estado + accesos rápidos).
  const packActivo = !!profile?.pack_semanal_activo;
  const packDias = profile?.pack_dias_semana ?? 5;
  const REDES_PACK_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };
  const redesActivas = (profile?.redes_activas?.length ? profile.redes_activas : ["instagram"])
    .map((r: string) => REDES_PACK_LABEL[r] || r).join(", ");
  const proximoLunesStr = proximoLunes().toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  let ultimoPackFecha: string | null = null;
  if (packActivo) {
    const { data: ultimoPack } = await supabase
      .from("packs_semanales").select("created_at").eq("user_id", session.user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (ultimoPack?.created_at) {
      ultimoPackFecha = new Date(ultimoPack.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    }
  }

  const QUICK_ACTIONS = [
    { href: "/create",   icon: "✨", title: "Crear contenido",          subtitle: "Instagram, Facebook o TikTok.", color: "#f9b23b", bg: "#fff8ef", locked: false },
    { href: "/dias",     icon: "📅", title: "Calendario de días clave", subtitle: subtituloCalendario,             color: "#93bf30", bg: "#f0f7e6", locked: !canUseFeature(profile, "dias_clave") },
    { href: "/stats",    icon: "📊", title: "Estadísticas",             subtitle: "Evolución de tu comunidad.",    color: "#ec4899", bg: "#fdf2f8", locked: !canUseFeature(profile, "stats_basic") },
  ];

  const RED_ICONS: Record<string, string> = { Instagram: "📸", Facebook: "👥", TikTok: "🎵", WhatsApp: "💬" };

  // Popup de novedades v1: solo si el flag es explícitamente false (= migración
  // aplicada y el usuario aún no lo ha visto). undefined (pre-migración) → no se muestra.
  const mostrarNovedades = profile?.popup_novedades_v1_visto === false;

  return (
    <div className="max-w-lg mx-auto">
      {mostrarNovedades && (
        <NovedadesPopup
          columna="popup_novedades_v1_visto"
          titulo="Nuevo en o2Wave"
          subtitulo="3 mejoras esta semana pedidas por usuarios reales"
          items={[
            { icono: "🪪", titulo: "Registro con DNI, NIE o Pasaporte", descripcion: "No solo CIF: ahora entran autónomos y residentes." },
            { icono: "🔍", titulo: "Genera el texto desde tu foto (Premium)", descripcion: "La IA mira tu foto y escribe el post por ti." },
            { icono: "🌐", titulo: "Posts en español, catalán o inglés", descripcion: "Elige el idioma de cada publicación." },
          ]}
          ctaPrincipal={{ label: "Probar ahora", href: "/create" }}
          ctaSecundario={{ label: "Ver el roadmap", href: ROADMAP_URL }}
        />
      )}
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <Logo size="md" />
        <Link href="/perfil" aria-label="Mi perfil">
          <Avatar profile={avatarProfile} />
        </Link>
      </div>

      {/* Aviso de suscripción activada (tras volver de Stripe Checkout) */}
      {pagoExitoso && (
        <div className="mx-5 mb-4 rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "#f0f7e6", border: "1px solid #d4e8b4" }}>
          <span className="text-xl flex-shrink-0">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "#3f6212" }}>Suscripción activa</p>
            <p className="text-xs" style={{ color: "#5a7d2a" }}>¡Gracias! Tu plan puede tardar unos segundos en reflejarse.</p>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div className="px-5 mb-5">
        <h1 className="text-xl font-bold text-gray-900">{nombre ? `Hola, ${nombre} 👋` : "Hola 👋"}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {recentPosts?.length
            ? `Tienes ${recentPosts.length} publicación${recentPosts.length > 1 ? "es" : ""} reciente${recentPosts.length > 1 ? "s" : ""}.`
            : "¿Listo para crear tu primer post?"}
        </p>
      </div>

      {/* Key date alert */}
      {nextDate && daysUntil !== null && daysUntil <= 14 && (
        <div className="mx-5 mb-5 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #f9b23b 0%, #f0a020 100%)" }}>
          <span className="text-2xl">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{nextDate.nombre}</p>
            <p className="text-orange-100 text-xs">
              {daysUntil === 0 ? "¡Hoy!" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`}
              {" · "}{new Date(nextDate.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </p>
          </div>
          <Link href="/create"
            className="bg-white rounded-xl px-3 py-2 text-xs font-bold flex-shrink-0"
            style={{ color: "#f9b23b" }}>
            Crear
          </Link>
        </div>
      )}

      {/* Panel del pack semanal automático — solo si el plan incluye la feature */}
      {canUseFeature(profile, "pack_semanal") && (
      <div className="px-5 mb-5">
        {packActivo ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: "#e0f2fe" }}>✉️</div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">Pack semanal automático</p>
                <p className="text-xs font-semibold" style={{ color: "#0ea5e9" }}>Activo</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-600 mb-4">
              <p>📅 Próximo envío: lunes {proximoLunesStr}</p>
              <p>🗂️ {packDias} días · {redesActivas}</p>
              {ultimoPackFecha && <p>📦 Último pack: {ultimoPackFecha}</p>}
            </div>
            <div className="space-y-2">
              <GenerarPackButton />
              <div className="flex gap-2">
                <Link href="/pack" className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold text-center transition-all active:scale-95"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}>📚 Ver todos los packs</Link>
                <Link href="/perfil#pack-semanal" className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold text-center transition-all active:scale-95"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}>⚙️ Editar configuración</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: "#eef2ff" }}>✉️</div>
              <p className="text-sm font-bold text-gray-800">Pack semanal automático</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Recibe tu plan de contenido completo cada lunes. 5-7 publicaciones automáticas con imagen, texto y hashtags listos para tu semana.
            </p>
            <Link href="/perfil#pack-semanal" className="block w-full py-3 rounded-xl font-bold text-white text-sm text-center transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>✨ Activar</Link>
          </div>
        )}
      </div>
      )}

      {/* Quick actions */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Acceso rápido</p>
        <div className="space-y-2">
          {QUICK_ACTIONS.map(({ href, icon, title, subtitle, color, bg, locked }) => (
            <Link key={href} href={locked ? "/plans" : href}
              className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm transition-all active:scale-[0.98]"
              style={locked ? { opacity: 0.6 } : undefined}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: bg }}>
                {locked ? "🔒" : icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400">{locked ? "Disponible en plan superior" : subtitle}</p>
              </div>
              <span className="text-lg font-bold flex-shrink-0" style={{ color: locked ? "#9ca3af" : color }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Administración (solo admins) */}
      {profile?.es_admin && (
        <div className="px-5 mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Administración</p>
          <Link href="/admin"
            className="rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)", display: "flex" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: "rgba(249,178,59,0.15)" }}>
              🛠️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Administración</p>
              <p className="text-xs text-gray-400">Panel interno de o2Wave</p>
            </div>
            {pendientesAdmin > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#f9b23b", color: "#0F0F0F" }}>
                {pendientesAdmin} pendiente{pendientesAdmin === 1 ? "" : "s"}
              </span>
            )}
            <span className="text-lg font-bold flex-shrink-0" style={{ color: "#f9b23b" }}>→</span>
          </Link>
        </div>
      )}

      {/* Recent posts */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recientes</p>
          <Link href="/create" className="text-xs font-semibold" style={{ color: "#f9b23b" }}>+ Crear</Link>
        </div>
        {recentPosts && recentPosts.length > 0 ? (
          <div className="space-y-2">
            {recentPosts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Link href={`/result?id=${post.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer transition-transform active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: "#f3f4f6" }}>
                    {RED_ICONS[post.red_social] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{post.tema}</p>
                    <p className="text-[10px] text-gray-400 truncate">{limpiarMarkdown(post.texto || "").slice(0, 60)}...</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-300">
                    {new Date(post.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                  <form action={deletePost}>
                    <input type="hidden" name="id" value={post.id} />
                    <button type="submit" aria-label="Borrar post"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      🗑️
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <span className="text-4xl block mb-2">✨</span>
            <p className="text-sm font-semibold text-gray-600 mb-1">Aún no hay posts</p>
            <p className="text-xs text-gray-400 mb-3">Crea tu primer contenido con IA</p>
            <Link href="/create"
              className="inline-block px-5 py-2.5 rounded-xl font-bold text-white text-xs"
              style={{ backgroundColor: "#f9b23b" }}>
              Crear ahora
            </Link>
          </div>
        )}
      </div>

      {/* Plan banner: solo donde tiene sentido mejorar (free ONG o Early Bird). No a admins. */}
      {!profile?.es_admin && ["ong_pequena", "earlybird"].includes(profile?.plan_actual ?? "") && (
        <div className="mx-5 mb-5 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}>
          <span className="text-2xl">🚀</span>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Mejora tu plan</p>
            <p className="text-gray-400 text-xs">Desbloquea más posts y funciones</p>
          </div>
          <Link href="/plans"
            className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "#f9b23b", color: "#0F0F0F" }}>
            Ver planes
          </Link>
        </div>
      )}
    </div>
  );
}
