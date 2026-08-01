import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled, metaOAuthConfigurado } from "@/lib/meta/config";
import AutopostView from "./autopost-view";

export const dynamic = "force-dynamic";

export default async function AutopostPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caller } = await supabase.from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const [cuentas, pendientes, programados, historico] = await Promise.all([
    // Nunca enviamos los tokens cifrados al cliente: solo columnas de UI.
    admin.from("autopost_cuentas")
      .select("id, etiqueta, fb_page_id, fb_page_nombre, ig_user_id, ig_username, token_expira_at, ig_token_expira_at, perfil_publicacion, auto_approve, frecuencia_semanal, dias_horas, activo")
      .order("created_at", { ascending: true }),
    admin.from("autopost_posts").select("*").eq("estado", "pending_review").order("created_at", { ascending: false }),
    admin.from("autopost_posts").select("*").eq("estado", "scheduled").order("publish_at", { ascending: true }),
    admin.from("autopost_posts").select("*").eq("estado", "published").order("publicado_at", { ascending: false }).limit(30),
  ]);

  return (
    <AutopostView
      cuentas={cuentas.data || []}
      pendientes={pendientes.data || []}
      programados={programados.data || []}
      historico={historico.data || []}
      enabled={autopostEnabled() && metaOAuthConfigurado()}
    />
  );
}
