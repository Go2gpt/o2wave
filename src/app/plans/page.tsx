import { createClient } from "@/lib/supabase-server";
import type { PlanActual } from "@/types";
import PlansView from "./plans-view";

export const dynamic = "force-dynamic";

export default async function PlansPage({ searchParams }: { searchParams: { success?: string; cancelled?: string; empresa_sin_sub?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let grupo: "ong" | "empresa" = "ong";
  let planActual: PlanActual | null = null;
  let esAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("tipo_entidad, plan_actual, es_admin").eq("id", user.id).single();
    grupo = (profile?.tipo_entidad || "").startsWith("ong") ? "ong" : "empresa";
    planActual = (profile?.plan_actual || "ong_pequena") as PlanActual;
    esAdmin = !!profile?.es_admin;
  }

  return (
    <PlansView
      autenticado={!!user}
      esAdmin={esAdmin}
      grupo={grupo}
      planActual={planActual}
      success={searchParams?.success === "1"}
      cancelled={searchParams?.cancelled === "1"}
      empresaSinSub={searchParams?.empresa_sin_sub === "1"}
    />
  );
}
