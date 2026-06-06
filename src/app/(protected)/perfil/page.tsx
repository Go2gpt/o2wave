import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ProfileForm, { type ProfileData } from "./profile-form";

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

  return (
    <ProfileForm
      initial={data as ProfileData}
      categoriasIniciales={categorias}
      mostrarDiasEspana={data.mostrar_dias_espana !== false}
    />
  );
}
