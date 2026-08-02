"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";

type Notify = (message: string, type: NonNullable<ToastState>["type"]) => void;

interface Cuenta {
  id: string; etiqueta: string;
  fb_page_id: string | null; fb_page_nombre: string | null;
  ig_user_id: string | null; ig_username: string | null;
  token_expira_at: string | null; ig_token_expira_at: string | null;
  perfil_publicacion: "producto" | "ong_general";
  auto_approve: boolean; frecuencia_semanal: number;
  dias_horas: { dia: number; hora: string }[] | null;
  activo: boolean;
}
interface Post {
  id: string; cuenta_id: string; estado: string; texto: string;
  imagen_url: string | null; red: string | null; publish_at: string | null;
  fb_post_url: string | null; ig_post_url: string | null; publicado_at: string | null;
  created_at: string; ultimo_error: string | null;
}

const DIAS = [["1", "L"], ["2", "M"], ["3", "X"], ["4", "J"], ["5", "V"], ["6", "S"], ["7", "D"]] as const;
const fmt = (s: string | null) => s ? new Date(s).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function semaforo(expira: string | null): { c: string; t: string } {
  if (!expira) return { c: "#93bf30", t: "Token permanente" };
  const dias = (new Date(expira).getTime() - Date.now()) / 86400000;
  if (dias <= 7) return { c: "#f87171", t: `Caduca en ${Math.max(0, Math.round(dias))}d` };
  if (dias <= 30) return { c: "#f9b23b", t: `Caduca en ${Math.round(dias)}d` };
  return { c: "#93bf30", t: "Token OK" };
}

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";
const btn = "px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40";
const input = "rounded-lg bg-white/5 border border-white/15 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#f9b23b]";

async function apiPost(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error || "error" };
  } catch { return { ok: false, error: "red" }; }
}

/** Publica una pieza inline (botón "Publicar ahora"). Devuelve el resultado. */
async function publicarAhora(id: string): Promise<{ ok: boolean; estado?: string; fb_post_url?: string | null; error?: string }> {
  try {
    const res = await fetch(`/api/admin/autopost/posts/${id}/publish-now`, { method: "POST" });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || "error" };
  } catch { return { ok: false, error: "red" }; }
}

/** Feedback común tras "Publicar ahora". */
function avisarResultado(r: { ok: boolean; estado?: string; fb_post_url?: string | null; error?: string }, notify: Notify) {
  if (r.ok && r.estado === "published") notify(`Publicado${r.fb_post_url ? `: ${r.fb_post_url}` : ""}`, "success");
  else if (r.ok) notify(`Programado (estado: ${r.estado}). ${r.error || ""}`.trim(), "info");
  else notify(`No se pudo publicar: ${r.error || "revisa el histórico"}`, "error");
}

function CuentaCard({ c, onChanged, notify }: { c: Cuenta; onChanged: () => void; notify: Notify }) {
  const [activo, setActivo] = useState(c.activo);
  const [perfil, setPerfil] = useState<Cuenta["perfil_publicacion"]>(c.perfil_publicacion);
  const [autoApprove, setAutoApprove] = useState(c.auto_approve);
  const [frecuencia, setFrecuencia] = useState(c.frecuencia_semanal || 1);
  const [franjas, setFranjas] = useState<{ dia: number; hora: string }[]>(c.dias_horas || []);
  const [saving, setSaving] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState("");
  const sem = semaforo(c.token_expira_at);
  const esOng = perfil === "ong_general";

  const generarPack = async () => {
    setGenerando(true);
    try {
      const res = await fetch(`/api/admin/autopost/accounts/${c.id}/generate-now`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.pieza_id) { notify("Pieza generada. Revísala en «Pendientes de revisión».", "success"); onChanged(); }
      else notify(data.error || "No se pudo generar la pieza", "error");
    } catch { notify("Error de red", "error"); } finally { setGenerando(false); }
  };

  const guardar = async () => {
    setSaving(true); setMsg("");
    const r = await apiPost("/api/admin/autopost/cuenta", {
      cuenta_id: c.id,
      patch: { activo, perfil_publicacion: perfil, auto_approve: esOng ? false : autoApprove, frecuencia_semanal: frecuencia, dias_horas: franjas },
    });
    setSaving(false);
    if (r.ok) { setMsg("Guardado ✓"); onChanged(); } else setMsg(r.error || "Error");
  };

  const desconectar = async () => {
    if (!confirm(`¿Desconectar ${c.etiqueta}? Se borra el token y sus posts.`)) return;
    const r = await apiPost("/api/admin/autopost/disconnect", { cuenta_id: c.id });
    if (r.ok) onChanged(); else setMsg(r.error || "Error");
  };

  const setFranja = (i: number, patch: Partial<{ dia: number; hora: string }>) =>
    setFranjas((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sem.c }} title={sem.t} />
            {c.etiqueta}
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {c.fb_page_nombre ? `FB: ${c.fb_page_nombre}` : "sin FB"}{c.ig_user_id ? ` · IG: ${c.ig_username ? `@${c.ig_username}` : c.ig_user_id}` : " · IG: sin conectar"}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            FB: {sem.t}{c.ig_user_id ? " · IG publica con el Page token" : " · IG: reconecta FB para vincular"}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {perfil === "producto" && (
            <button onClick={generarPack} disabled={generando} className={`${btn} text-[#0F0F0F]`} style={{ backgroundColor: "#93bf30" }}>
              {generando ? "Generando…" : "Generar pack ahora"}
            </button>
          )}
          <button onClick={desconectar} className={`${btn} border border-white/15 text-red-300`}>Desconectar</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-white/70">Activa (genera pack)</span>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4" style={{ accentColor: "#93bf30" }} />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-white/70">Perfil de contenido</span>
          <select value={perfil} onChange={(e) => setPerfil(e.target.value as Cuenta["perfil_publicacion"])} className={input}>
            <option value="producto">Producto</option>
            <option value="ong_general">ONG general</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-white/70">Auto-aprobar {esOng && <em className="text-[10px] text-white/30">(no en ONG)</em>}</span>
          <input type="checkbox" checked={autoApprove && !esOng} disabled={esOng} onChange={(e) => setAutoApprove(e.target.checked)} className="w-4 h-4" style={{ accentColor: "#f9b23b" }} />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-white/70">Posts/semana</span>
          <select value={frecuencia} onChange={(e) => setFrecuencia(Number(e.target.value))} className={input}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/50">Franjas (día + hora, Madrid)</span>
          <button onClick={() => setFranjas((f) => [...f, { dia: 3, hora: "10:00" }])} className="text-xs font-semibold" style={{ color: "#f9b23b" }}>+ Añadir franja</button>
        </div>
        <div className="space-y-1.5">
          {franjas.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={f.dia} onChange={(e) => setFranja(i, { dia: Number(e.target.value) })} className={input}>
                {DIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="time" value={f.hora} onChange={(e) => setFranja(i, { hora: e.target.value })} className={input} />
              <button onClick={() => setFranjas((x) => x.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400 px-2">×</button>
            </div>
          ))}
          {!franjas.length && <p className="text-[11px] text-white/30">Sin franjas → se programa por defecto al día siguiente 10:00.</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button onClick={guardar} disabled={saving} className={`${btn} text-[#0F0F0F]`} style={{ backgroundColor: "#f9b23b" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {msg && <span className="text-xs text-white/50">{msg}</span>}
      </div>
    </div>
  );
}

function PiezaPendiente({ p, onChanged, notify, cuentaEtiqueta }: { p: Post; onChanged: () => void; notify: Notify; cuentaEtiqueta: string }) {
  const [busy, setBusy] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.texto);
  const [imagenUrl, setImagenUrl] = useState<string | null>(p.imagen_url);
  const [preview, setPreview] = useState(false);

  // Cerrar el modal con Esc.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const accion = async (a: "aprobar" | "rechazar") => {
    if (a === "rechazar" && !confirm("¿Rechazar esta pieza? No se podrá recuperar.")) return;
    setBusy(true);
    const r = await apiPost("/api/admin/autopost/post", { post_id: p.id, accion: a });
    setBusy(false);
    if (r.ok) { notify(a === "aprobar" ? "Pieza aprobada y programada." : "Pieza rechazada.", "success"); onChanged(); }
    else notify(r.error || "Error", "error");
  };
  const ahora = async () => {
    setBusy(true);
    const r = await publicarAhora(p.id);
    setBusy(false);
    avisarResultado(r, notify);
    onChanged();
  };
  const guardarTexto = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/autopost/posts/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (res.ok) { setEditando(false); notify("Texto guardado.", "success"); }
      else notify(data.error || "No se pudo guardar", "error");
    } catch { notify("Error de red", "error"); } finally { setBusy(false); }
  };
  const regenerar = async () => {
    setRegenerando(true);
    try {
      const res = await fetch(`/api/admin/autopost/posts/${p.id}/regenerate-image`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.imagen_url) { setImagenUrl(data.imagen_url); notify("Imagen regenerada.", "success"); }
      else notify(data.error || "No se pudo regenerar la imagen", "error");
    } catch { notify("Error de red", "error"); } finally { setRegenerando(false); }
  };

  // Acciones (compartidas por la card y el modal). En modo edición → Guardar/Cancelar.
  const acciones = editando ? (
    <>
      <button onClick={guardarTexto} disabled={busy} className={`${btn} text-[#0F0F0F]`} style={{ backgroundColor: "#f9b23b" }}>{busy ? "…" : "Guardar"}</button>
      <button onClick={() => { setTexto(p.texto); setEditando(false); }} disabled={busy} className={`${btn} border border-white/15 text-white/70`}>Cancelar</button>
    </>
  ) : (
    <>
      <button onClick={ahora} disabled={busy || regenerando} className={`${btn} text-[#0F0F0F]`} style={{ backgroundColor: "#93bf30" }}>{busy ? "…" : "Publicar ahora"}</button>
      <button onClick={() => accion("aprobar")} disabled={busy || regenerando} className={`${btn} border border-white/15 text-white/90`}>Aprobar (programar)</button>
      <button onClick={() => setEditando(true)} disabled={busy || regenerando} className={`${btn} border border-white/15 text-white/90`}>Editar texto</button>
      <button onClick={regenerar} disabled={busy || regenerando} className={`${btn} border border-white/15 text-white/90`}>{regenerando ? "Generando…" : "Regenerar imagen"}</button>
      <button onClick={() => accion("rechazar")} disabled={busy || regenerando} className={`${btn} border border-white/15 text-red-300`}>Rechazar</button>
    </>
  );

  return (
    <>
      <div className={card}>
        <div className="flex gap-3">
          {imagenUrl && (
            <button type="button" onClick={() => setPreview(true)} title="Ver a tamaño real" className="relative w-24 h-24 flex-shrink-0">
              <img src={imagenUrl} alt="" className="w-24 h-24 rounded-lg object-cover" />
              {regenerando && <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center text-[11px] text-white">Generando…</div>}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/40 mb-1">{cuentaEtiqueta} · {p.red || "—"} · creado {fmt(p.created_at)}</p>
            {editando ? (
              <textarea value={texto} maxLength={2200} rows={6} onChange={(e) => setTexto(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f9b23b]" />
            ) : (
              <button type="button" onClick={() => setPreview(true)} className="text-left w-full">
                <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-6">{texto}</p>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {!editando && <button onClick={() => setPreview(true)} className={`${btn} border border-white/15 text-white/90`}>👁 Ver</button>}
          {acciones}
        </div>
      </div>

      {/* Modal preview a tamaño real */}
      {preview && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setPreview(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl p-4 sm:p-6 my-8 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">{cuentaEtiqueta}</p>
                <p className="text-[11px] text-white/40">{p.red || "—"} · creado {fmt(p.created_at)}</p>
              </div>
              <button onClick={() => setPreview(false)} aria-label="Cerrar" className="text-white/50 hover:text-white text-2xl leading-none px-2">×</button>
            </div>

            {imagenUrl && (
              <div className="relative mb-4">
                <img src={imagenUrl} alt="" className="w-full rounded-lg max-h-[65vh] object-contain bg-black/30" />
                {regenerando && <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center text-sm">Generando…</div>}
              </div>
            )}

            {editando ? (
              <textarea value={texto} maxLength={2200} rows={10} onChange={(e) => setTexto(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f9b23b] mb-4" />
            ) : (
              <p className="text-sm text-white/85 whitespace-pre-wrap mb-4">{texto}</p>
            )}

            <div className="flex flex-wrap gap-2">{acciones}</div>
          </div>
        </div>
      )}
    </>
  );
}

function PiezaProgramada({ p, onChanged, notify }: { p: Post; onChanged: () => void; notify: Notify }) {
  const [busy, setBusy] = useState(false);
  const ahora = async () => {
    setBusy(true);
    const r = await publicarAhora(p.id);
    setBusy(false);
    avisarResultado(r, notify);
    onChanged();
  };
  return (
    <div className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
      <span className="text-sm text-white/80 truncate">{p.texto.slice(0, 60)}…</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-white/40">{p.red} · {fmt(p.publish_at)}</span>
        <button onClick={ahora} disabled={busy} className={`${btn} text-[#0F0F0F]`} style={{ backgroundColor: "#93bf30" }}>{busy ? "…" : "Publicar ahora"}</button>
      </div>
    </div>
  );
}

export default function AutopostView({ cuentas, pendientes, programados, historico, enabled }: {
  cuentas: Cuenta[]; pendientes: Post[]; programados: Post[]; historico: Post[]; enabled: boolean;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [toast, setToast] = useState<ToastState>(null);
  const notify: Notify = (message, type) => setToast({ message, type });

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white px-4 sm:px-5 py-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <BackLink href="/admin" dark>Administración</BackLink>
          <div className="mt-3"><Logo size="md" /></div>
          <h1 className="text-xl font-semibold mt-4">Auto-publicación (Fase 1a)</h1>
          <p className="text-sm text-white/50 mt-1">Solo cuentas internas de Generación o2. Uso interno.</p>
        </div>

        {!enabled && (
          <div className="rounded-2xl border border-[#f9b23b]/40 bg-[#f9b23b]/10 p-4 mb-6 text-sm text-[#f9d9a8]">
            Autopost desactivado o Meta App sin configurar. Revisa AUTOPOST_ENABLED, META_APP_ID/SECRET.
          </div>
        )}

        {/* Cuentas */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white/80">Cuentas conectadas ({cuentas.length})</h2>
            <a href="/api/meta/oauth/start" className={`${btn} text-[#0F0F0F] ${enabled ? "" : "pointer-events-none opacity-40"}`} style={{ backgroundColor: "#f9b23b" }}>
              + Conectar cuenta
            </a>
          </div>
          {cuentas.length === 0
            ? <div className={`${card} text-white/50 text-sm`}>Ninguna cuenta conectada. Pulsa «Conectar cuenta» para el OAuth de Meta.</div>
            : <div className="space-y-3">{cuentas.map((c) => <CuentaCard key={c.id} c={c} onChanged={refresh} notify={notify} />)}</div>}
        </section>

        {/* Pendientes de revisión */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-white/80 mb-3">Pendientes de revisión ({pendientes.length})</h2>
          {pendientes.length === 0
            ? <div className={`${card} text-white/50 text-sm`}>Nada pendiente.</div>
            : <div className="space-y-3">{pendientes.map((p) => <PiezaPendiente key={p.id} p={p} onChanged={refresh} notify={notify} cuentaEtiqueta={cuentas.find((cc) => cc.id === p.cuenta_id)?.etiqueta || "—"} />)}</div>}
        </section>

        {/* Programados (próximas 4 semanas) */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-white/80 mb-3">Programados ({programados.length})</h2>
          {programados.length === 0
            ? <div className={`${card} text-white/50 text-sm`}>Nada programado.</div>
            : <div className={`${card} divide-y divide-white/10`}>
                {programados.map((p) => <PiezaProgramada key={p.id} p={p} onChanged={refresh} notify={notify} />)}
              </div>}
        </section>

        {/* Histórico */}
        <section>
          <h2 className="text-sm font-bold text-white/80 mb-3">Histórico (últimos {historico.length})</h2>
          {historico.length === 0
            ? <div className={`${card} text-white/50 text-sm`}>Aún no se ha publicado nada.</div>
            : <div className={`${card} divide-y divide-white/10`}>
                {historico.map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <span className="text-sm text-white/80 truncate">{p.texto.slice(0, 50)}…</span>
                    <span className="text-xs text-white/40 flex-shrink-0 flex items-center gap-2">
                      {fmt(p.publicado_at)}
                      {p.fb_post_url && <a href={p.fb_post_url} target="_blank" rel="noreferrer" className="underline">FB</a>}
                      {p.ig_post_url && <a href={p.ig_post_url} target="_blank" rel="noreferrer" className="underline">IG</a>}
                    </span>
                  </div>
                ))}
              </div>}
        </section>
      </div>
    </main>
  );
}
