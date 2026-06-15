"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { createClient } from "@/lib/supabase";
import { pollForImage, aspectFor } from "@/lib/pollImage";
import { limpiarMarkdown } from "@/lib/formatText";
import Spinner from "@/components/ui/Spinner";
import Toast, { type ToastState } from "@/components/Toast";
import type { GeneratedPost } from "@/types";



function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.get("id");

  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenImg, setRegenImg] = useState(false);
  const [regenTxt, setRegenTxt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor de titular sobre la imagen
  const [headline, setHeadline] = useState("");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(85);
  const [fontSize, setFontSize] = useState(52); // px referenciado a 1080
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [textEnabled, setTextEnabled] = useState(true);
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharingImg, setSharingImg] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [canShareText, setCanShareText] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [dragging, setDragging] = useState(false);
  const [dispW, setDispW] = useState(0);
  const [textBoxH, setTextBoxH] = useState(0);
  const imgBoxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // PNG ya compuesto (titular + marca horneados) listo para compartir. Se
  // pregenera al cargar y tras cada edición, así el handler de "Compartir"
  // puede llamar a navigator.share() SÍNCRONAMENTE (iOS no bloquea el gesto).
  const composedRef = useRef<{ key: string; file: File } | null>(null);

  useEffect(() => {
    if (!id) { router.push("/create"); return; }
    supabase.from("generated_posts").select("*").eq("id", id).single()
      .then(({ data }) => {
        setPost(data);
        setLoading(false);
        if (data) setHeadline((params.get("titular") || data.tema || "").slice(0, 100));
      });
  }, [id, router, supabase, params]);

  // Ancho mostrado de la imagen (para escalar el texto del preview a 1080).
  useEffect(() => {
    const el = imgBoxRef.current;
    if (!el) return;
    const update = () => setDispW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [post]);

  // Alto del bloque de texto (para dimensionar la franja del preview).
  useEffect(() => {
    if (textRef.current) setTextBoxH(textRef.current.offsetHeight);
  }, [headline, fontSize, dispW, textEnabled]);

  // Soporte de Web Share API (texto y archivos).
  useEffect(() => {
    const text = typeof navigator !== "undefined" && typeof navigator.share === "function";
    setCanShareText(text);
    try {
      const probe = new File([new Blob([new Uint8Array([0])], { type: "image/png" })], "probe.png", { type: "image/png" });
      setCanShareFiles(text && typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // Cuerpo de la petición de composición a partir del estado actual del editor.
  const composeBody = () => {
    if (!post?.imagen_url) return null;
    return {
      imageUrl: post.imagen_url,
      headline: textEnabled ? headline : null,
      positionX: posX, positionY: posY, fontSize,
      aspectRatio: aspectFor(post.red_social, post.formato),
      textAlign,
    };
  };

  // Pregeneración: compone el PNG en background (debounce) y lo cachea en
  // composedRef. Solo en navegadores que soportan compartir archivos (iOS/PWA).
  useEffect(() => {
    if (!canShareFiles) return;
    const body = composeBody();
    if (!body) return;
    const key = JSON.stringify(body);
    if (composedRef.current?.key === key) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/compose-and-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        composedRef.current = { key, file: new File([blob], `o2wave-${id}.png`, { type: "image/png" }) };
      } catch { /* reintenta en el próximo cambio */ }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShareFiles, post?.imagen_url, headline, textEnabled, posX, posY, fontSize, textAlign, id]);

  const regenerateImage = async () => {
    if (!post) return;
    setRegenImg(true);
    try {
      const formData = {
        nombreOrganizacion: post.nombre_entidad || "",
        tipoOrganizacion: post.tipo_entidad || "ong",
        redSocial: post.red_social,
        formatoInstagram: post.formato,
        tema: post.tema,
        tono: post.tono,
        incluirHashtags: true,
        incluirEmojis: true,
      };
      const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formData }) });
      const data = await res.json();
      // El endpoint es síncrono (OpenAI) → devuelve imagenUrl. Mantenemos polling
      // como compat por si algún flujo devolviera predictionId.
      const imagenUrl = data.imagenUrl ?? (data.predictionId ? await pollForImage(data.predictionId) : null);
      if (imagenUrl) {
        await supabase.from("generated_posts").update({ imagen_url: imagenUrl }).eq("id", post.id);
        setPost(p => p ? { ...p, imagen_url: imagenUrl } : p);
      }
    } finally { setRegenImg(false); }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !post) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) { console.error("upload error:", upErr); return; }

      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
      const imagenUrl = pub.publicUrl;

      await supabase.from("generated_posts").update({ imagen_url: imagenUrl }).eq("id", post.id);
      setPost(p => p ? { ...p, imagen_url: imagenUrl } : p);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const regenerateText = async () => {
    if (!post) return;
    setRegenTxt(true);
    try {
      const esTikTok = post.red_social === "TikTok";
      const params = post.guion_tiktok?.params;
      const formData = {
        nombreOrganizacion: post.nombre_entidad || "",
        tipoOrganizacion: post.tipo_entidad || "ong",
        redSocial: post.red_social,
        formatoInstagram: post.formato,
        tema: post.tema,
        tono: post.tono,
        // TikTok: respetar los mismos parámetros (duración, tono, entorno).
        duracionTikTok: params?.duracion || "30s",
        tonoTikTok: params?.tono || post.tono || "Cercano",
        entornoTikTok: params?.entorno || "",
        incluirHashtags: true,
        incluirEmojis: true,
      };
      const res = await fetch("/api/generate-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.texto) {
        const update = esTikTok
          ? { texto: data.texto, guion_tiktok: data.guion ?? null }
          : { texto: data.texto };
        await supabase.from("generated_posts").update(update).eq("id", post.id);
        setPost(p => p ? { ...p, ...update } : p);
      }
    } finally { setRegenTxt(false); }
  };

  // Copiar un hashtag suelto (toast informativo).
  const copyHashtag = async (h: string) => {
    try { await navigator.clipboard.writeText(h); setToast({ message: `Copiado: ${h}`, type: "info" }); } catch {}
  };
  const copyAllHashtags = async (hashtags: string[]) => {
    try { await navigator.clipboard.writeText(hashtags.join(" ")); setToast({ message: "Todos los hashtags copiados", type: "success" }); } catch {}
  };
  // Copiar el guion completo formateado (usa el texto plano que ya genera el endpoint).
  const copyFullGuion = () => {
    navigator.clipboard.writeText(limpiarMarkdown(post?.texto || ""));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyText = () => { navigator.clipboard.writeText(limpiarMarkdown(post?.texto || "")); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadText = () => {
    const blob = new Blob([limpiarMarkdown(post?.texto || "")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `o2wave-texto-${id}.txt`; a.click();
  };
  // Descarga con horneado: el servidor estampa el titular en la posición/tamaño elegidos.
  const handleDownload = async () => {
    if (!post?.imagen_url) return;
    setDownloading(true);
    try {
      const aspect = aspectFor(post.red_social, post.formato);
      const res = await fetch("/api/compose-and-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: post.imagen_url,
          headline: textEnabled ? headline : null,
          positionX: posX, positionY: posY, fontSize, aspectRatio: aspect, textAlign,
        }),
      });
      if (!res.ok) throw new Error("compose failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `o2wave-${id}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      if (post.imagen_url) window.open(post.imagen_url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const silenciable = (e: unknown) => {
    const name = e instanceof Error ? e.name : "";
    return name === "AbortError" || name === "NotAllowedError";
  };

  const shareText = async (texto: string) => {
    try {
      await navigator.share({ text: texto });
    } catch (e) {
      if (!silenciable(e)) setToast({ message: "Error al compartir. Inténtalo de nuevo.", type: "error" });
    }
  };

  const toastCopiado = () => {
    const esStory = post?.formato === "Story 9:16";
    setToast({
      message: esStory
        ? "Caption copiado. Pégalo manualmente como texto sobre tu story."
        : "Caption copiado. Pégalo en la app destino si no aparece automáticamente.",
      type: "info",
    });
  };

  // Handler SÍNCRONO: dentro del gesto del usuario copiamos el caption y, si el
  // PNG ya está pregenerado y al día, llamamos a navigator.share() sin ningún
  // await previo (clave para que iOS no bloquee ni el clipboard ni el share).
  // Texto a copiar en Story: titular + hashtags (sin el cuerpo largo del
  // caption, que no cabe). Los hashtags se extraen del caption. Si el total
  // supera ~250 chars (límite de Stories) se recortan hashtags, no el titular.
  const textoStoryClipboard = () => {
    const titular = headline.trim();
    const caption = limpiarMarkdown(post?.texto || "");
    // Incluye acentos/ñ (À-ÿ) sin flag unicode (tsconfig target = es5).
    const tags = caption.match(/#[A-Za-z0-9_À-ÿ]+/g) || [];
    const LIMITE = 250;
    const armar = () => (tags.length ? `${titular}\n\n${tags.join(" ")}` : titular);
    let texto = armar();
    while (tags.length && texto.length > LIMITE) { tags.pop(); texto = armar(); }
    return texto;
  };

  const shareImage = () => {
    if (!post?.imagen_url) return;
    // En Story el caption completo no cabe (límite ~250 chars y suele no pegar):
    // copiamos titular + hashtags. Post/Reel/FB/WhatsApp: caption completo.
    const esStory = post.formato === "Story 9:16";
    const textoParaClipboard = esStory ? textoStoryClipboard() : limpiarMarkdown(post.texto || "");
    // 1) Clipboard SÍNCRONO (sin await) dentro del gesto → iOS lo permite.
    try { navigator.clipboard?.writeText(textoParaClipboard); } catch { /* no soportado */ }

    const body = composeBody();
    const ready = composedRef.current;
    // 2) Si el PNG pregenerado corresponde al estado actual: share síncrono.
    if (body && ready && ready.key === JSON.stringify(body) && navigator.canShare?.({ files: [ready.file] })) {
      toastCopiado();
      navigator.share({ files: [ready.file], text: textoParaClipboard }).catch((e) => {
        if (!silenciable(e)) setToast({ message: "Error al compartir. Inténtalo de nuevo.", type: "error" });
      });
      return;
    }
    // 3) Fallback: aún no pregenerado o parámetros cambiados → componer y compartir.
    void shareImageAsync(textoParaClipboard);
  };

  // Fallback asíncrono (el clipboard ya se escribió en el gesto). Compone el PNG
  // y comparte; en iOS el share puede bloquearse tras el await, de ahí la ruta
  // síncrona preferente de arriba.
  const shareImageAsync = async (caption: string) => {
    const body = composeBody();
    if (!body) return;
    setSharingImg(true);
    try {
      const res = await fetch("/api/compose-and-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("compose failed");
      const blob = await res.blob();
      const file = new File([blob], `o2wave-${id}.png`, { type: "image/png" });
      composedRef.current = { key: JSON.stringify(body), file };
      if (!(navigator.canShare && navigator.canShare({ files: [file] }))) throw new Error("files no soportados");
      toastCopiado();
      await navigator.share({ files: [file], text: caption });
    } catch (e) {
      if (!silenciable(e)) setToast({ message: "Error al compartir. Inténtalo de nuevo.", type: "error" });
    } finally {
      setSharingImg(false);
    }
  };

  // Arrastre del titular (pointer events: mouse + touch)
  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !imgBoxRef.current) return;
    const r = imgBoxRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setPosX(Math.max(5, Math.min(95, x)));
    setPosY(Math.max(5, Math.min(95, y)));
  };
  const onPointerUp = () => setDragging(false);

  const btn = "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-40";
  const btnStyle = { borderColor: "#e5e7eb", color: "#374151" };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Post no encontrado</p></div>;

  const isStory = post.formato === "Story 9:16";
  const isTikTok = post.red_social === "TikTok";
  const guion = post.guion_tiktok && Array.isArray(post.guion_tiktok.guion) && post.guion_tiktok.guion.length
    ? post.guion_tiktok
    : null;
  const RED_LABELS: Record<string, string> = { Instagram: "📸 Instagram", Facebook: "👥 Facebook", TikTok: "🎵 TikTok", WhatsApp: "💬 WhatsApp" };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {/* Back */}
      <div className="mb-4">
        <BackLink href="/create">Crear</BackLink>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
          {RED_LABELS[post.red_social]}
        </span>
        {post.formato && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">{post.formato === "Story 9:16" ? "Story" : "Post"}</span>}
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">{post.tono}</span>
      </div>

      {/* Image block */}
      {!isTikTok && (
        <>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          {/* Cada red en su formato nativo: Post 4:5 (1080×1350), Story 9:16, Facebook/WhatsApp como antes. */}
          <div ref={imgBoxRef} className="relative w-full bg-gray-100" style={{ paddingTop: isStory ? "177.78%" : post.red_social === "Instagram" ? "125%" : "100%" }}>
            {post.imagen_url ? (
              <img src={post.imagen_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size={8} color="gray-300" />
              </div>
            )}

            {/* Overlay del titular (preview que imita el horneado) */}
            {post.imagen_url && textEnabled && headline.trim() && (
              <>
                <div className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: `${posY}%`, transform: "translateY(-50%)",
                    height: Math.max(textBoxH * 1.7, 80),
                    background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.55) 50%, transparent)",
                  }} />
                <div ref={textRef}
                  onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                  className="absolute font-bold select-none"
                  style={{
                    top: `${posY}%`,
                    ...(textAlign === "center"
                      ? { left: `${posX}%`, transform: "translate(-50%,-50%)", textAlign: "center" as const }
                      : textAlign === "left"
                        ? { left: "7.5%", transform: "translateY(-50%)", textAlign: "left" as const }
                        : { right: "7.5%", transform: "translateY(-50%)", textAlign: "right" as const }),
                    maxWidth: "85%", color: "#FFFFFF", fontFamily: "Montserrat, sans-serif", fontWeight: 700,
                    fontSize: dispW ? fontSize * (dispW / 1080) : 24, lineHeight: 1.2,
                    textShadow: "0 0 6px rgba(0,0,0,0.6)",
                    cursor: dragging ? "grabbing" : "grab", touchAction: "none",
                  }}>
                  {headline}
                </div>
              </>
            )}

            {(regenImg || uploading) && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Spinner /><p className="text-white text-sm font-semibold">{uploading ? "Subiendo imagen..." : "Generando tu contenido..."}</p>
              </div>
            )}
          </div>

          {/* Controles del editor de texto */}
          {post.imagen_url && (
            <div className="px-4 pt-3 space-y-3 border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Texto sobre la imagen</span>
                <button onClick={() => setTextEnabled(v => !v)}
                  className="text-xs font-bold" style={{ color: textEnabled ? "#9ca3af" : "#f9b23b" }}>
                  {textEnabled ? "Quitar texto" : "Añadir texto"}
                </button>
              </div>
              {textEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setDraftText(headline); setEditingText(true); }} className={btn} style={btnStyle}>✎ Editar texto</button>
                    <span className="text-[11px] text-gray-400">Arrastra el texto sobre la imagen</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tamaño</label>
                    <input type="range" min={isStory ? 18 : 28} max={72} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                      className="w-full accent-[#f9b23b]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Alineación</label>
                    <div className="flex gap-2">
                      {([["left","◀","Izquierda"],["center","▬","Centro"],["right","▶","Derecha"]] as const).map(([val, icon, lbl]) => {
                        const activo = textAlign === val;
                        return (
                          <button key={val} type="button" onClick={() => setTextAlign(val)} aria-label={lbl}
                            className="flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                            style={activo ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" } : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                            {icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Compartir (Web Share API con archivos) */}
          {canShareFiles && (
            <div className="px-4 pt-3">
              <button onClick={shareImage} disabled={!post.imagen_url || sharingImg}
                className={`${btn} w-full justify-center`} style={{ borderColor: "#f9b23b", backgroundColor: "#f9b23b", color: "#fff" }}>
                {sharingImg ? "Preparando..." : "📤 Compartir"}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
                💡 ¿Primera vez? Pulsa Compartir, elige tu red, y al pegar el caption mantén pulsado el campo de texto y dale a &quot;Pegar&quot;.{" "}
                <button onClick={() => setHelpOpen(true)} className="font-semibold underline" style={{ color: "#f9b23b" }}>
                  Ver cómo funciona
                </button>
              </p>
            </div>
          )}

          {/* Acciones de imagen */}
          <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
            <button onClick={handleDownload} disabled={!post.imagen_url || downloading} className={btn} style={btnStyle}>
              {downloading ? "Preparando..." : "↓ Descargar"}
            </button>
            <button onClick={regenerateImage} disabled={regenImg || uploading} className={btn} style={btnStyle}>↻ Regenerar imagen</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={regenImg || uploading} className={btn} style={btnStyle}>⬆ Subir una imagen tuya</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
          </div>
          {/* Caso B: soporta texto pero no archivos → sugerir descargar para compartir */}
          {!canShareFiles && canShareText && (
            <p className="px-4 pb-3 text-[11px] text-gray-400">Descárgala y compártela en tu app preferida.</p>
          )}
        </div>

        {/* Modal editar texto */}
        {editingText && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70]" onClick={() => setEditingText(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 mb-3">Editar texto</h3>
              <textarea value={draftText} maxLength={100} rows={3} onChange={e => setDraftText(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ borderColor: "#f9b23b" }} autoFocus />
              <p className="text-[10px] text-gray-300 text-right mt-1">{draftText.length}/100</p>
              <button onClick={() => { setHeadline(draftText.trim()); setEditingText(false); }}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm mt-2" style={{ backgroundColor: "#f9b23b" }}>
                Guardar
              </button>
              <button onClick={() => setEditingText(false)} className="w-full py-2.5 text-sm text-gray-500 font-medium">Cancelar</button>
            </div>
          </div>
        )}

        {/* Mini-modal: cómo publicar en redes */}
        {helpOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-4" onClick={() => setHelpOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full sm:max-w-[480px] relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setHelpOpen(false)} aria-label="Cerrar"
                className="absolute top-4 right-4 text-gray-300 hover:text-gray-600 text-xl leading-none">✕</button>
              <h3 className="font-bold text-gray-900 text-lg mb-4 pr-6">Cómo publicar en redes</h3>
              <ol className="space-y-3">
                <li className="flex gap-3"><span className="text-xl flex-shrink-0">📤</span><p className="text-sm text-gray-700 leading-relaxed"><strong>Pulsa &quot;Compartir&quot;</strong> en o2Wave.</p></li>
                <li className="flex gap-3"><span className="text-xl flex-shrink-0">📱</span><p className="text-sm text-gray-700 leading-relaxed"><strong>Elige tu red social</strong> (Instagram, Facebook, TikTok, WhatsApp...).</p></li>
                <li className="flex gap-3"><span className="text-xl flex-shrink-0">📋</span><p className="text-sm text-gray-700 leading-relaxed"><strong>Sube la imagen.</strong> Cuando llegues al campo de caption (texto), <strong>mantén pulsado</strong> ahí.</p></li>
                <li className="flex gap-3"><span className="text-xl flex-shrink-0">📌</span><p className="text-sm text-gray-700 leading-relaxed"><strong>Pulsa &quot;Pegar&quot;</strong> — tu texto se rellena automáticamente. ¡Listo, publica!</p></li>
              </ol>
              <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                o2Wave copia automáticamente tu caption al portapapeles para que solo tengas que pegarlo.
              </p>
              <button onClick={() => setHelpOpen(false)}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm mt-5" style={{ backgroundColor: "#f9b23b" }}>
                Entendido
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* TikTok header */}
      {isTikTok && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}>
          <span className="text-4xl">🎵</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Guion de TikTok</p>
            <p className="text-gray-400 text-xs truncate">
              {guion?.params ? `${guion.params.duracion} · ${guion.params.tono}` : "Guion estructurado para vídeo corto"}
            </p>
          </div>
          {regenTxt && <Spinner size={4} color="gray-400" />}
        </div>
      )}

      {/* ---------- TikTok: guion estructurado ---------- */}
      {isTikTok && guion && (
        <div className="space-y-4 mb-4">
          {/* GUION cronológico */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">📜 Guion</h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              {guion.guion.map((s, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-bold mb-1" style={{ color: "#f9b23b" }}>{s.tiempo}</p>
                  {s.voz && <p className="text-sm text-gray-800 italic leading-relaxed">“{s.voz}”</p>}
                  {s.accion && <p className="text-xs text-gray-500 mt-1.5">🎥 {s.accion}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* PLANOS */}
          {guion.planos.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">🎬 Planos a grabar</h3>
              </div>
              <ol className="px-4 py-3 space-y-2">
                {guion.planos.map((p) => (
                  <li key={p.numero} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>{p.numero}</span>
                    <span className="leading-relaxed">{p.descripcion}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* AUDIO */}
          {guion.audio_sugerido && (
            <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">🎵 Audio sugerido</h3>
              </div>
              <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed">{guion.audio_sugerido}</p>
            </section>
          )}

          {/* HASHTAGS */}
          {guion.hashtags.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">#️⃣ Hashtags</h3>
                <button onClick={() => copyAllHashtags(guion.hashtags)} className="text-xs font-bold" style={{ color: "#f9b23b" }}>
                  Copiar todos
                </button>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {guion.hashtags.map((h, i) => (
                  <button key={i} onClick={() => copyHashtag(h)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95"
                    style={{ backgroundColor: "#f3f4f6", color: "#374151" }}>
                    {h}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={copyFullGuion} className={btn} style={copied ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" } : btnStyle}>
              {copied ? "✓ Copiado" : "📋 Copiar guion completo"}
            </button>
            {canShareText && (
              <button onClick={() => shareText(limpiarMarkdown(post.texto || ""))} className={btn} style={btnStyle}>📤 Compartir guion</button>
            )}
            <button onClick={regenerateText} disabled={regenTxt} className={btn} style={btnStyle}>↻ Regenerar texto</button>
          </div>
        </div>
      )}

      {/* TikTok sin guion estructurado: fallback amable con el texto bruto */}
      {isTikTok && !guion && (
        <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500">⚠️ El guion no se pudo estructurar bien, te dejo el texto sin formato. Puedes regenerar.</p>
          </div>
          <div className="px-4 py-3">
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>
              {limpiarMarkdown(post.texto || "")}
            </pre>
          </div>
          <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex gap-2 flex-wrap">
            <button onClick={copyText} className={btn} style={copied ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" } : btnStyle}>
              {copied ? "✓ Copiado" : "📋 Copiar"}
            </button>
            {canShareText && <button onClick={() => shareText(limpiarMarkdown(post.texto || ""))} className={btn} style={btnStyle}>📤 Compartir guion</button>}
            <button onClick={regenerateText} disabled={regenTxt} className={btn} style={btnStyle}>↻ Regenerar texto</button>
          </div>
        </div>
      )}

      {/* ---------- Instagram / Facebook: texto plano ---------- */}
      {!isTikTok && (
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Texto generado</h3>
          {regenTxt && <span className="flex items-center gap-1 text-xs text-gray-400"><Spinner size={3} color="gray-400" />Generando...</span>}
        </div>
        <div className="px-4 py-3">
          <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>
            {limpiarMarkdown(post.texto || "")}
          </pre>
        </div>
        {/* Row 2: text actions */}
        <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex gap-2 flex-wrap">
          <button onClick={copyText} className={btn} style={copied ? { borderColor: "#93bf30", backgroundColor: "#f0f7e6", color: "#93bf30" } : btnStyle}>
            {copied ? "✓ Copiado" : "📋 Copiar"}
          </button>
          <button onClick={downloadText} className={btn} style={btnStyle}>↓ Texto</button>
          <button onClick={regenerateText} disabled={regenTxt} className={btn} style={btnStyle}>↻ Regenerar texto</button>
        </div>
      </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>}><ResultContent /></Suspense>;
}
