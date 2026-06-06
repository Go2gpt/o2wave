"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { pollForImage, aspectFor } from "@/lib/pollImage";
import { limpiarMarkdown } from "@/lib/formatText";
import Spinner from "@/components/ui/Spinner";
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
        const aspect = aspectFor(post.red_social, post.formato);
        const imagenUrl = await pollForImage(data.predictionId, post.tema, aspect);
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
              <img src={post.imagen_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size={8} color="gray-300" />
              </div>
            )}
            {(regenImg || uploading) && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Spinner /><p className="text-white text-sm font-semibold">{uploading ? "Subiendo imagen..." : "Generando tu contenido..."}</p>
              </div>
            )}
          </div>

          {/* Row 1: image actions */}
          <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
            <button onClick={downloadImage} disabled={!post.imagen_url} className={btn} style={btnStyle}>↓ Imagen</button>
            <button onClick={regenerateImage} disabled={regenImg || uploading} className={btn} style={btnStyle}>↻ Regenerar imagen</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={regenImg || uploading} className={btn} style={btnStyle}>⬆ Subir imagen</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
          </div>
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
    </div>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={8} color="gray-400" /></div>}><ResultContent /></Suspense>;
}
