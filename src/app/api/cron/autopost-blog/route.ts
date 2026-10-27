import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled } from "@/lib/meta/config";
import { crearNovedadesBlog } from "@/lib/autopost/blogIg";

export const maxDuration = 120;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron horario (Vercel, minuto :30): deja programada UNA noticia nueva del blog
// para go2.bcn, en orden cronológico y alternando claro/oscuro. El cron de
// publicación (C5, minuto :00) la publica. 1 por ejecución → una ráfaga de N
// noticias se reparte a ~1/hora manteniendo el orden y el damero.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!autopostEnabled()) return NextResponse.json({ skipped: "autopost_disabled" });

  const admin = createAdminClient();
  const res = await crearNovedadesBlog(admin, { max: 1 });
  if (res.error) console.error("cron autopost-blog:", res.error);
  return NextResponse.json(res);
}
