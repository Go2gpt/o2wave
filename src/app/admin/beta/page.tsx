import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import BetaGenerar from "./beta-generar";

export const dynamic = "force-dynamic";

export default async function AdminBetaPage() {
  // Solo admins (mismo patrón que el resto del panel)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caller } = await supabase
    .from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  // Códigos ya existentes (service role: omite RLS)
  const admin = createAdminClient();
  const { data: filas, count } = await admin
    .from("beta_invitaciones")
    .select("codigo, estado", { count: "exact" })
    .order("created_at", { ascending: true });
  const total = count ?? 0;
  const codigos = (filas ?? []).map((f) => (f as { codigo: string }).codigo);

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <BackLink href="/admin" dark>Panel</BackLink>
          <div className="mt-3"><Logo size="md" /></div>
          <h1 className="text-xl font-semibold mt-4">Programa Beta — códigos</h1>
          <p className="text-sm text-white/50 mt-1">
            Genera los códigos de invitación (cupón Stripe 100% · 6 meses, un solo uso cada uno).
            Cada código se guarda en beta_invitaciones para que Growth los reparta.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 p-5 bg-white/5">
          <p className="text-sm text-white/70 mb-4">
            Códigos actuales en base de datos: <strong>{total}</strong>
          </p>
          <BetaGenerar existentes={total} />
        </div>

        {codigos.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-white/50 mb-2">Todos los códigos ({codigos.length}):</p>
            <textarea
              readOnly
              value={codigos.join("\n")}
              className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-white/80"
            />
          </div>
        )}
      </div>
    </main>
  );
}
