import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import Logo from "@/components/Logo";

function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---$/gm, '')
    .replace(/^#{1,6}\s/gm, '')
    .trim();
}

export default async function DashboardPage() {
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

  const nombre = profile?.nombre_entidad || session.user.email?.split("@")[0] || "Usuario";

  const nextDate = keyDates?.[0];
  const daysUntil = nextDate
    ? Math.ceil((new Date(nextDate.fecha).getTime() - Date.now()) / 86400000)
    : null;

  const QUICK_ACTIONS = [
    { href: "/create",   icon: "✨", title: "Crear contenido",          subtitle: "Instagram, Facebook o TikTok.", color: "#f9b23b", bg: "#fff8ef" },
    { href: "/calendar", icon: "📅", title: "Calendario de días clave", subtitle: "3 eventos esta semana.",        color: "#93bf30", bg: "#f0f7e6" },
    { href: "/send",     icon: "📤", title: "Envío automático",         subtitle: "Pack semanal en PDF listo.",    color: "#6366f1", bg: "#eef2ff" },
    { href: "/stats",    icon: "📊", title: "Estadísticas",             subtitle: "Evolución de tu comunidad.",    color: "#ec4899", bg: "#fdf2f8" },
  ];

  const RED_ICONS: Record<string, string> = { Instagram: "📸", Facebook: "👥", TikTok: "🎵" };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <Logo size="md" />
        <Link href="/profile"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: "#f9b23b" }}>
          {nombre.charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* Greeting */}
      <div className="px-5 mb-5">
        <h1 className="text-xl font-bold text-gray-900">Hola, {nombre} 👋</h1>
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

      {/* Quick actions */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Acceso rápido</p>
        <div className="space-y-2">
          {QUICK_ACTIONS.map(({ href, icon, title, subtitle, color, bg }) => (
            <Link key={href} href={href}
              className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm transition-all active:scale-[0.98]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: bg }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400">{subtitle}</p>
              </div>
              <span className="text-lg font-bold flex-shrink-0" style={{ color }}>→</span>
            </Link>
          ))}
        </div>
      </div>

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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "#f3f4f6" }}>
                  {RED_ICONS[post.red_social] || "📄"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{post.tema}</p>
                  <p className="text-[10px] text-gray-400 truncate">{limpiarMarkdown(post.texto || "").slice(0, 50)}...</p>
                </div>
                <span className="text-[10px] text-gray-300 flex-shrink-0">
                  {new Date(post.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </span>
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

      {/* Plan banner (free users) */}
      {profile?.plan === "free" && (
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
