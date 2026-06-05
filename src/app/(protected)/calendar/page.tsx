import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPermisos } from "@/lib/permissions";

const TIPO_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  internacional: { bg: "#eef2ff", color: "#6366f1", icon: "🌍" },
  comercial:     { bg: "#fff8ef", color: "#f9b23b", icon: "🛍️" },
  festivo:       { bg: "#f0f7e6", color: "#93bf30", icon: "🎉" },
  general:       { bg: "#f3f4f6", color: "#6b7280", icon: "📌" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr + "T12:00:00").getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff <= 7) return `En ${diff} días`;
  return null;
}

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/welcome");

  const { data: profile } = await supabase.from("profiles").select("sector, tipo_entidad").eq("id", session.user.id).single();
  if (!getPermisos(profile?.tipo_entidad).calendario) redirect("/plans");

  // Fetch dates — sector-aware
  const today = new Date().toISOString().split("T")[0];
  const { data: allDates } = await supabase
    .from("key_dates")
    .select("*")
    .gte("fecha", today)
    .order("fecha", { ascending: true });

  // Prioritize dates matching user sector + general dates
  const sector = profile?.sector || "general";
  const prioritized = (allDates || []).sort((a, b) => {
    const aMatch = a.sector?.includes(sector) || a.sector?.includes("general");
    const bMatch = b.sector?.includes(sector) || b.sector?.includes("general");
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // Group by month
  const grouped: Record<string, typeof prioritized> = {};
  for (const d of prioritized) {
    const month = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(d);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Días clave</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fechas relevantes para tu sector · <span className="font-semibold" style={{ color: "#f9b23b" }}>{sector}</span>
        </p>
      </div>

      <div className="px-5 space-y-6 pb-4">
        {Object.entries(grouped).map(([month, dates]) => (
          <div key={month}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 capitalize">{month}</p>
            <div className="space-y-2.5">
              {dates.map(date => {
                const style = TIPO_COLORS[date.tipo] || TIPO_COLORS.general;
                const urgency = daysUntil(date.fecha);
                const sectorMatch = date.sector?.includes(sector);
                return (
                  <div key={date.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: style.bg }}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-gray-800 truncate">{date.nombre}</p>
                        {sectorMatch && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: style.bg, color: style.color }}>Tu sector</span>}
                      </div>
                      <p className="text-xs text-gray-400 capitalize">{formatDate(date.fecha)}</p>
                      {date.descripcion && <p className="text-[11px] text-gray-300 truncate mt-0.5">{date.descripcion}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {urgency && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ backgroundColor: urgency === "Hoy" ? "#f9b23b" : "#f3f4f6", color: urgency === "Hoy" ? "#fff" : "#6b7280" }}>
                          {urgency}
                        </span>
                      )}
                      <Link href={`/create?tema=${encodeURIComponent(date.nombre)}`}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl"
                        style={{ backgroundColor: style.bg, color: style.color }}>
                        Crear
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {prioritized.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📅</span>
            <p className="text-gray-500 font-semibold">No hay fechas próximas</p>
          </div>
        )}
      </div>
    </div>
  );
}
