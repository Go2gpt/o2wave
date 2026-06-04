"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { pollForImage } from "@/lib/pollImage";
import Spinner from "@/components/ui/Spinner";
import type { GeneratedPost } from "@/types";

type OverlayPos = "top" | "center" | "bottom";
const POS_CLASS: Record<OverlayPos, string> = { top: "items-start", center: "items-center", bottom: "items-end" };

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.get("id");

  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [overlayPos, setOverlayPos] = useState<OverlayPos>("bottom");
  const [copied, setCopied] = useState(false);
  const [regenImg, setRegenImg] = useState(false);
  const [regenTxt, setRegenTxt] = useState(false);

  useEffect(() => {
    if (!id) { router.push("/create"); return; }
    supabase.from("generated_posts").select("*").eq("id", id).single()
      .then(({ data }) => { setPost(data); setLoading(false); });
  }, [id, router, supabase]);

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

  const copyText = () => { navigator.clipboard.writeText(post?.texto || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadText = () => {
    const blob = new Blob([post?.texto || ""], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `o2wave-texto-${id}.txt`; a.click();
  };
  const downloadImage = async () => {
    if (!post?.imagen_url) return;
    try {
      const res = await fetch(post.imagen_url);
      const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `o2wave-imagen-${id}.png`; a.click();
    } catch { window.open(post.imagen_url, "_blank"); }
  };

  const btn = "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-40";
  const btnStyle = { borderColor: "#e5e7eb", color: "#374151" };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Post no encontrado</p></div>;

  const isStory = post.formato === "Story 9:16";
  const isTikTok = post.red_social === "TikTok";
  const RED_LABELS: Record<string, string> = { Instagram: "📸 Instagram", Facebook: "👥 Facebook", TikTok: "🎵 TikTok" };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
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
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="relative w-full bg-gray-100" style={{ paddingTop: isStory ? "177.78%" : "100%" }}>
            {post.imagen_url ? (
              <>
                <img src={post.imagen_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {overlayOpen && overlayText && (
                  <div className={`absolute inset-0 flex flex-col ${POS_CLASS[overlayPos]} p-4 pointer-events-none`}>
                    <div className="bg-black/60 rounded-xl px-3 py-2 backdrop-blur-sm">
                      <p className="text-white text-sm font-bold leading-snug">{overlayText}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size={8} color="gray-300" />
              </div>
            )}
            {regenImg && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Spinner /><p className="text-white text-sm font-semibold">Generando tu contenido...</p>
              </div>
            )}
          </div>

          {/* Row 1: image actions */}
          <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
            <button onClick={downloadImage} disabled={!post.imagen_url} className={btn} style={btnStyle}>↓ Imagen</button>
            <button onClick={regenerateImage} disabled={regenImg} className={btn} style={btnStyle}>↻ Regenerar imagen</button>
            <button onClick={() => { setOverlayOpen(o => !o); if (!overlayText) setOverlayText(post.texto?.split("\n").find(l => l.trim()) || ""); }}
              className={btn} style={overlayOpen ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" } : btnStyle}>
              ✎ Editar texto
            </button>
          </div>

          {overlayOpen && (
            <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Posición</p>
                <div className="flex gap-1">
                  {(["top", "center", "bottom"] as OverlayPos[]).map(p => (
                    <button key={p} onClick={() => setOverlayPos(p)}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                      style={overlayPos === p ? { borderColor: "#f9b23b", backgroundColor: "#fff8ef", color: "#f9b23b" } : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}>
                      {p === "top" ? "Arriba" : p === "center" ? "Centro" : "Abajo"}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={overlayText} onChange={e => setOverlayText(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                style={{ fontFamily: "inherit", borderColor: "#f9b23b" }} />
            </div>
          )}
        </div>
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
            {post.texto}
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
    </div>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>}><ResultContent /></Suspense>;
}
