import { createClient } from "@/lib/supabase-server";
import type { PlanActual } from "@/types";
import { grupoCuenta, type GrupoCuenta } from "@/lib/copys-por-tipo";
import PlansView from "./plans-view";

export const dynamic = "force-dynamic";

export default async function PlansPage({ searchParams }: { searchParams: { success?: string; cancelled?: string; empresa_sin_sub?: string; particular_sin_sub?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let grupo: GrupoCuenta = "ong";
  let planActual: PlanActual | null = null;
  let esAdmin = false;
  let aceptaMencion = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("tipo_entidad, plan_actual, es_admin, acepta_mencion_go2").eq("id", user.id).single();
    grupo = grupoCuenta(profile?.tipo_entidad);
    planActual = (profile?.plan_actual || "ong_pequena") as PlanActual;
    esAdmin = !!profile?.es_admin;
    aceptaMencion = !!profile?.acepta_mencion_go2;
  }

  return (
    <PlansView
      autenticado={!!user}
      esAdmin={esAdmin}
      grupo={grupo}
      planActual={planActual}
      aceptaMencion={aceptaMencion}
      success={searchParams?.success === "1"}
      cancelled={searchParams?.cancelled === "1"}
      empresaSinSub={searchParams?.empresa_sin_sub === "1"}
      particularSinSub={searchParams?.particular_sin_sub === "1"}
    />
  );
}
