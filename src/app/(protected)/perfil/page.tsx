import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ProfileForm, { type ProfileData } from "./profile-form";
import CuentasSociales, { type CuentaSocial } from "./cuentas-sociales";
import { publicacionDirectaHabilitada } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) redirect("/login");

  const { data: catRows } = await supabase
    .from("categorias_usuario").select("categoria").eq("user_id", user.id);
  const categorias = (catRows || []).map((c) => c.categoria);

  // Cuentas sociales conectadas (RLS: solo las del propio usuario). Sin el token.
  const { data: cuentasRows } = await supabase
    .from("user_social_accounts")
    .select("id, etiqueta, ig_username, fb_page_nombre, es_predeterminada")
    .eq("user_id", user.id).eq("activo", true)
    .order("es_predeterminada", { ascending: false }).order("created_at", { ascending: true });

  // ¿Mostrar la publicación directa? (abierta a todos, admin, o cuenta de review).
  const publicacionDirectaOn = await publicacionDirectaHabilitada(supabase, user.id);

  return (
    <>
      <ProfileForm
        initial={data as ProfileData}
        categoriasIniciales={categorias}
        mostrarDiasEspana={data.mostrar_dias_espana !== false}
      />
      <Suspense fallback={null}>
        <CuentasSociales
          cuentas={(cuentasRows || []) as CuentaSocial[]}
          habilitado={publicacionDirectaOn}
        />
      </Suspense>
    </>
  );
}
