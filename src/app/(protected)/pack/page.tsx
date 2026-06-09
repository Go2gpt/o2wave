import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { PackSemanal } from "@/types";
import PackList from "./pack-list";

export const dynamic = "force-dynamic";

export default async function PackPage({ searchParams }: { searchParams: { abrir?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("packs_semanales")
    .select("*")
    .eq("user_id", user.id)
    .order("fecha_inicio", { ascending: false })
    .limit(8);

  return <PackList packs={(data || []) as PackSemanal[]} abrirInicial={searchParams?.abrir} />;
}
