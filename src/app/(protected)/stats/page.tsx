import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPermisos } from "@/lib/permissions";
import BackLink from "@/components/BackLink";

export default async function StatsPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/welcome");

  const { data: permProfile } = await supabase.from("profiles").select("tipo_entidad, es_admin").eq("id", session.user.id).single();
  if (!getPermisos(permProfile?.tipo_entidad, permProfile?.es_admin).estadisticas) redirect("/plans");

  // User's own stats
  const { count: totalPosts } = await supabase
    .from("generated_posts").select("*", { count: "exact", head: true }).eq("user_id", session.user.id);

  const { data: byRed } = await supabase
    .from("generated_posts").select("red_social").eq("user_id", session.user.id);

  const redCounts: Record<string, number> = {};
  (byRed || []).forEach(p => { redCounts[p.red_social] = (redCounts[p.red_social] || 0) + 1; });

  // Community stats (approximate — counts without user filter)
  const { count: communityPosts } = await supabase
    .from("generated_posts").select("*", { count: "exact", head: true });

  const { count: communityUsers } = await supabase
    .from("profiles").select("*", { count: "exact", head: true });

  const RED_ICONS: Record<string, string> = { Instagram: "📸", Facebook: "👥", TikTok: "🎵" };
  const RED_COLORS: Record<string, string> = { Instagram: "#e1306c", Facebook: "#1877f2", TikTok: "#0F0F0F" };

  const COMMUNITY = [
    { label: "Posts generados", value: communityPosts?.toLocaleString() || "—", icon: "✨", color: "#f9b23b" },
    { label: "Organizaciones", value: communityUsers?.toLocaleString() || "—", icon: "🌍", color: "#93bf30" },
    { label: "Horas ahorradas", value: ((communityPosts || 0) * 0.5).toFixed(0) + "h", icon: "⏱️", color: "#6366f1" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-1">
        <BackLink href="/dashboard">Inicio</BackLink>
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu actividad y la comunidad o²Wave</p>
      </div>

      {/* User stats */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tu actividad</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-black mb-1" style={{ color: "#f9b23b" }}>{totalPosts || 0}</p>
            <p className="text-xs font-semibold text-gray-500">Posts generados</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-black mb-1" style={{ color: "#93bf30" }}>
              {((totalPosts || 0) * 0.5).toFixed(1)}h
            </p>
            <p className="text-xs font-semibold text-gray-500">Tiempo ahorrado</p>
          </div>
        </div>
      </div>

      {/* By network */}
      {Object.keys(redCounts).length > 0 && (
        <div className="px-5 mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Por red social</p>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {Object.entries(redCounts).sort((a, b) => b[1] - a[1]).map(([red, count]) => {
              const pct = Math.round((count / (totalPosts || 1)) * 100);
              return (
                <div key={red}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      {RED_ICONS[red]} {red}
                    </span>
                    <span className="text-xs font-bold text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RED_COLORS[red] || "#f9b23b" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Comunidad o²Wave</p>
        <div className="space-y-2.5">
          {COMMUNITY.map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: color + "20" }}>
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600">{label}</p>
              </div>
              <p className="text-xl font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Solidarity message */}
      <div className="mx-5 mb-5 rounded-2xl p-4"
        style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}>
        <p className="text-white font-bold text-sm mb-1">💚 Impacto colectivo</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          Cada post generado es tiempo que ONGs y PYMEs dedican a lo que de verdad importa: su misión.
        </p>
      </div>
    </div>
  );
}
