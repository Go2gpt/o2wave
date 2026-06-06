import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import AdminCard from "./AdminCard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Solo admins
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caller } = await supabase
    .from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  // Contador de verificaciones pendientes (service role: omite RLS)
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("estado_verificacion", "pendiente")
    .not("documento_url", "is", null);
  const pendientes = count ?? 0;

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Logo size="md" />
          <h1 className="text-xl font-semibold mt-4">Panel de administración</h1>
          <p className="text-sm text-white/50 mt-1">Gestión interna de o2Wave.</p>
        </div>

        {/* Grid responsive: añadir nuevas AdminCard aquí en el futuro */}
        <div className="grid sm:grid-cols-2 gap-4">
          <AdminCard
            href="/admin/verificaciones"
            icon="📋"
            title="Verificaciones de ONGs"
            description="Revisa y aprueba la documentación de las entidades."
            badge={pendientes > 0 ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : "Todo al día"}
          />
        </div>
      </div>
    </main>
  );
}
