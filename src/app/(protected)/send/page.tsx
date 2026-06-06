import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// La pantalla "Envío automático" se sustituyó por el flujo del Pack semanal:
// si el usuario lo tiene activo, va a su historial /pack; si no, a /perfil
// para activarlo. Mantenemos la ruta como redirect para no romper enlaces.
export default async function SendPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles").select("pack_semanal_activo").eq("id", user.id).single();

  redirect(profile?.pack_semanal_activo ? "/pack" : "/perfil");
}
