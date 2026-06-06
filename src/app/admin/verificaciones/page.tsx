import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import VerificacionActions from "./actions";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  ong_pequena: "ONG pequeña",
  ong_mediana: "ONG mediana",
  empresa: "Empresa",
};

interface PendingProfile {
  id: string;
  email: string;
  nombre_entidad: string | null;
  tipo_entidad: string | null;
  nif: string | null;
  documento_url: string | null;
  updated_at: string | null;
}

export default async function AdminVerificacionesPage() {
  // 1) Auth + comprobación de admin (sesión por cookies, RLS permite ver el propio perfil)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caller } = await supabase
    .from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) redirect("/dashboard");

  // 2) Listado de pendientes con documento subido (service role: omite RLS)
  const admin = createAdminClient();
  const { data: pendientes } = await admin
    .from("profiles")
    .select("id, email, nombre_entidad, tipo_entidad, nif, documento_url, updated_at")
    .eq("estado_verificacion", "pendiente")
    .not("documento_url", "is", null)
    .order("updated_at", { ascending: true })
    .returns<PendingProfile[]>();

  // 3) Signed URL (5 min) por documento
  const filas = await Promise.all(
    (pendientes ?? []).map(async (p) => {
      let docUrl: string | null = null;
      if (p.documento_url) {
        const { data: signed } = await admin.storage
          .from("verification-docs")
          .createSignedUrl(p.documento_url, 300);
        docUrl = signed?.signedUrl ?? null;
      }
      return { ...p, docUrl };
    })
  );

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-[#93bf30]">o²</span>
            <span className="text-[#f9b23b]">Wave</span>
          </span>
          <h1 className="text-xl font-semibold mt-4">Verificaciones pendientes</h1>
          <p className="text-sm text-white/50 mt-1">
            {filas.length} {filas.length === 1 ? "organización espera" : "organizaciones esperan"} revisión.
          </p>
        </div>

        {filas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold">Todo al día</p>
            <p className="text-sm text-white/50 mt-1">No hay verificaciones pendientes ahora mismo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filas.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.nombre_entidad || p.email}</p>
                    <p className="text-xs text-white/50 truncate">{p.email}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "rgba(147,191,48,0.15)", color: "#93bf30" }}>
                    {TIPO_LABEL[p.tipo_entidad || ""] || p.tipo_entidad || "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-white/60 mb-3">
                  <div><span className="text-white/40">NIF:</span> {p.nif || "—"}</div>
                  <div>
                    <span className="text-white/40">Subido:</span>{" "}
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </div>
                </div>

                {p.docUrl ? (
                  <a href={p.docUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f9b23b] hover:underline">
                    📄 Ver documento
                  </a>
                ) : (
                  <span className="text-sm text-white/40">Documento no disponible</span>
                )}

                <VerificacionActions userId={p.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
