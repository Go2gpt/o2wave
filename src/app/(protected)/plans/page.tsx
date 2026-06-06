import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { PlanActual } from "@/types";
import PlansView from "./plans-view";

export const dynamic = "force-dynamic";

export default async function PlansPage({ searchParams }: { searchParams: { success?: string; cancelled?: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles").select("tipo_entidad, plan_actual, plan_estado").eq("id", session.user.id).single();

  const esOng = (profile?.tipo_entidad || "").startsWith("ong");
  const planActual = (profile?.plan_actual || "ong_pequena") as PlanActual;

  return (
    <PlansView
      grupo={esOng ? "ong" : "empresa"}
      planActual={planActual}
      success={searchParams?.success === "1"}
      cancelled={searchParams?.cancelled === "1"}
    />
  );
}
