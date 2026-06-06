import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { FechaUsuario } from "@/types";
import MisFechasList from "./mis-fechas-list";

export const dynamic = "force-dynamic";

export default async function MisFechasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("fechas_usuario")
    .select("*")
    .eq("user_id", user.id)
    .order("mes", { ascending: true })
    .order("dia", { ascending: true });

  return <MisFechasList fechas={(data || []) as FechaUsuario[]} />;
}
