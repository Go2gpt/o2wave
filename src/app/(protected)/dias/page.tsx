import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { preseleccionarCategorias } from "@/lib/preseleccionarCategorias";
import { calcularProximos, type DiaClave } from "@/lib/categorias";
import { getPermisos } from "@/lib/permissions";
import DiasList from "./dias-list";

export const dynamic = "force-dynamic";

export default async function DiasPage({ searchParams }: { searchParams: { represeleccionar?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate de permisos: lectura mínima y robusta (solo columnas estables).
  // No se acopla a columnas nuevas para que el bypass de admin nunca se rompa
  // si una migración aún no se ha aplicado.
  const { data: perfilBase } = await supabase
    .from("profiles").select("tipo_entidad, es_admin").eq("id", user.id).single();
  if (!getPermisos(perfilBase?.tipo_entidad, perfilBase?.es_admin).calendario) redirect("/plans");

  // Re-disparar la preselección IA (solo admins): ?represeleccionar=true resetea
  // la marca para que la lógica de abajo vuelva a ejecutarse. Útil para diagnóstico.
  if (searchParams?.represeleccionar === "true" && perfilBase?.es_admin) {
    await supabase.from("profiles").update({ categorias_preseleccionadas: false }).eq("id", user.id);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("categorias_preseleccionadas, mostrar_dias_espana")
    .eq("id", user.id)
    .single();

  // Primera vez: preseleccionar con IA (idempotente, tolerante a fallos).
  if (profile && !profile.categorias_preseleccionadas) {
    await preseleccionarCategorias(supabase, user.id);
    await supabase.from("profiles").update({ categorias_preseleccionadas: true }).eq("id", user.id);
  }

  const { data: catRows } = await supabase
    .from("categorias_usuario").select("categoria").eq("user_id", user.id);
  const catList = (catRows || []).map((c) => c.categoria);

  // Días clave de las categorías del usuario (si tiene).
  let diasClave: DiaClave[] = [];
  if (catList.length) {
    const ambitos = profile?.mostrar_dias_espana === false ? ["internacional"] : ["internacional", "espana"];
    const { data: dias } = await supabase
      .from("dias_clave").select("*").in("categoria", catList).in("ambito", ambitos);
    diasClave = (dias || []) as DiaClave[];
  }

  // Fechas personalizadas del usuario → forma DiaClave con marca esFechaUsuario.
  const { data: fechasRows } = await supabase
    .from("fechas_usuario").select("*").eq("user_id", user.id);
  const fechasUsuario: DiaClave[] = (fechasRows || []).map((f) => ({
    id: f.id,
    mes: f.mes,
    dia: f.dia,
    nombre: f.nombre,
    categoria: "mi_fecha",
    ambito: "personal",
    relevancia: "alto",
    descripcion: f.descripcion ?? null,
    recurrente: f.recurrente ?? true,
    ano_especifico: f.ano_especifico ?? null,
    esFechaUsuario: true,
  }));

  const proximos = calcularProximos([...diasClave, ...fechasUsuario]).slice(0, 30);

  return <DiasList proximos={proximos} hasCats={catList.length > 0} tieneFechas={fechasUsuario.length > 0} />;
}
