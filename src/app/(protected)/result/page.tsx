"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
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
  const [textEnabled, setTextEnabled] = useState(true);
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState("");
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
      if (data.predictionId) {
        const imagenUrl = await pollForImage(data.predictionId);
        if (imagenUrl) {
          await supabase.from("generated_posts").update({ imagen_url: imagenUrl }).eq("id", post.id);
          setPost(p => p ? { ...p, imagen_url: imagenUrl } : p);
        }
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
      const res = await fetch("/api/generate-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.texto) {
        await supabase.from("generated_posts").update({ texto: data.texto }).eq("id", post.id);
        setPost(p => p ? { ...p, texto: data.texto } : p);
      }
    } finally { setRegenTxt(false); }
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
          positionX: posX, positionY: posY, fontSize, aspectRatio: aspect,
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

  const shareImage = async () => {
    if (!post?.imagen_url) return;
    setSharingImg(true);
    try {
      const caption = limpiarMarkdown(post.texto || "");

      // Workaround Instagram (descarta el text al recibir files): copiamos el
      // caption al portapapeles antes de compartir. Dentro del gesto de usuario.
      let copiado = false;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(caption); copiado = true; } catch {}
      }

      const aspect = aspectFor(post.red_social, post.formato);
      const res = await fetch("/api/compose-and-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: post.imagen_url,
          headline: textEnabled ? headline : null,
          positionX: posX, positionY: posY, fontSize, aspectRatio: aspect,
        }),
      });
      if (!res.ok) throw new Error("compose failed");
      const blob = await res.blob();
      const file = new File([blob], `o2wave-${id}.png`, { type: "image/png" });
      if (!(navigator.canShare && navigator.canShare({ files: [file] }))) throw new Error("files no soportados");

      // Justo antes del menú nativo, avisamos de que el caption está copiado.
      if (copiado) setToast({ message: "Caption copiado. Pégalo en la app destino si no aparece automáticamente.", type: "info" });

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
  const RED_LABELS: Record<string, string> = { Instagram: "📸 Instagram", Facebook: "👥 Facebook", TikTok: "🎵 TikTok" };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {/* Back */}
      <Link href="/create" className="flex items-center gap-1.5 text-sm text-gray-500 font-semibold mb-4">
        ← Generar otro
      </Link>

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
          <div ref={imgBoxRef} className="relative w-full bg-gray-100" style={{ paddingTop: isStory ? "177.78%" : "100%" }}>
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
                  className="absolute text-center font-bold select-none"
                  style={{
                    left: `${posX}%`, top: `${posY}%`, transform: "translate(-50%,-50%)",
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
                    <input type="range" min={28} max={72} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                      className="w-full accent-[#f9b23b]" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Compartir (Web Share API con archivos) */}
          {canShareFiles && (
            <div className="px-4 pt-3 flex gap-2 flex-wrap">
              <button onClick={shareImage} disabled={!post.imagen_url || sharingImg}
                className={btn} style={{ borderColor: "#f9b23b", backgroundColor: "#f9b23b", color: "#fff" }}>
                {sharingImg ? "Preparando..." : "📤 Compartir"}
              </button>
            </div>
          )}

          {/* Acciones de imagen */}
          <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
            <button onClick={handleDownload} disabled={!post.imagen_url || downloading} className={btn} style={btnStyle}>
              {downloading ? "Preparando..." : "↓ Descargar"}
            </button>
            <button onClick={regenerateImage} disabled={regenImg || uploading} className={btn} style={btnStyle}>↻ Regenerar imagen</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={regenImg || uploading} className={btn} style={btnStyle}>⬆ Subir imagen</button>
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
        </>
      )}

      {/* TikTok header */}
      {isTikTok && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #1c1c1c 100%)" }}>
          <span className="text-4xl">🎵</span>
          <div>
            <p className="text-white font-bold text-sm">Script de TikTok</p>
            <p className="text-gray-400 text-xs">Guion estructurado para video corto</p>
          </div>
        </div>
      )}

      {/* Text block */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {isTikTok ? "Script de TikTok" : "Texto generado"}
          </h3>
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
          {/* En TikTok no hay imagen: ofrecemos compartir el guion (solo texto) */}
          {isTikTok && canShareText && (
            <button onClick={() => shareText(limpiarMarkdown(post.texto || ""))} className={btn} style={btnStyle}>📤 Compartir guion</button>
          )}
          <button onClick={regenerateText} disabled={regenTxt} className={btn} style={btnStyle}>↻ Regenerar texto</button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>}><ResultContent /></Suspense>;
}
