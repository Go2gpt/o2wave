import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { PackSemanal } from "@/types";
import DiaEditor from "./dia-editor";

export const dynamic = "force-dynamic";

export default async function DiaEditorPage({ params }: { params: { pack_id: string; dia_index: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: pack } = await admin.from("packs_semanales").select("*").eq("id", params.pack_id).single();
  if (!pack || pack.user_id !== user.id) redirect("/pack");

  const idx = parseInt(params.dia_index, 10);
  const dias = (pack as PackSemanal).contenido?.dias || [];
  if (Number.isNaN(idx) || idx < 0 || idx >= dias.length) redirect("/pack");

  return <DiaEditor packId={params.pack_id} diaIndex={idx} dia={dias[idx]} />;
}
