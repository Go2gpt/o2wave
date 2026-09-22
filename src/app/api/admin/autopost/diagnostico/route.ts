import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import ffmpegPath from "ffmpeg-static";
import { requireAdmin } from "@/lib/adminAudit";
import { descifrarToken } from "@/lib/crypto-tokens";
import { META_GRAPH } from "@/lib/meta/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Permisos que el endpoint de vídeo/Reels de Meta acepta ("any of").
const PERMS_VIDEO = ["pages_read_engagement", "pages_manage_metadata", "pages_read_user_content", "pages_manage_ads", "pages_show_list", "pages_messaging"];

function resolverFfmpeg(): string | null {
  const cwd = process.cwd();
  const cands = [
    ffmpegPath as string | null,
    path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
  ].filter(Boolean) as string[];
  for (const c of cands) { try { if (existsSync(c)) return c; } catch { /* next */ } }
  return null;
}

// Diagnóstico de ffmpeg (Vercel) y del token de Meta. Solo admin. Sin efectos.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // ---- 1) ffmpeg ----
  const bin = resolverFfmpeg();
  const ffmpeg: Record<string, unknown> = { requirePath: ffmpegPath, resuelto: bin, cwd: process.cwd() };
  if (bin) {
    try {
      const v = spawnSync(bin, ["-version"], { encoding: "utf8" });
      ffmpeg.version = (v.stdout || "").split("\n")[0];
      const enc = spawnSync(bin, ["-hide_banner", "-encoders"], { encoding: "utf8" });
      ffmpeg.hasLibx264 = /libx264/.test(enc.stdout || "");
      ffmpeg.hasAac = /\baac\b/.test(enc.stdout || "");
      // Encode de prueba con LOS MISMOS flags que el Reel → ¿produce vídeo válido?
      const out = path.join(os.tmpdir(), `diag-${Date.now()}.mp4`);
      const test = spawnSync(bin, ["-y", "-f", "lavfi", "-i", "testsrc=size=360x640:duration=1:rate=30",
        "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-level", "4.0",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { encoding: "utf8" });
      ffmpeg.testEncodeExit = test.status;
      ffmpeg.testEncodeOk = test.status === 0 && existsSync(out);
      if (test.status !== 0) ffmpeg.testEncodeErr = (test.stderr || "").slice(-500);
    } catch (e) { ffmpeg.error = e instanceof Error ? e.message : String(e); }
  }

  // ---- 2) token de Meta ----
  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("etiqueta, fb_page_id, ig_user_id, token_cifrado")
    .eq("perfil_publicacion", "producto").maybeSingle();
  const meta: Record<string, unknown> = { cuenta: cuenta?.etiqueta, fb_page_id: cuenta?.fb_page_id, ig_user_id: cuenta?.ig_user_id };
  if (cuenta) {
    try {
      const token = descifrarToken(cuenta.token_cifrado);
      const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
      const res = await fetch(`${META_GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`, { cache: "no-store" });
      const j = await res.json();
      const d = (j.data || {}) as { type?: string; scopes?: string[]; is_valid?: boolean; profile_id?: string; error?: unknown };
      meta.token_type = d.type;            // USER | PAGE
      meta.token_valido = d.is_valid;
      meta.profile_id = d.profile_id;
      meta.scopes = d.scopes || [];
      meta.tiene_permiso_video = (d.scopes || []).some((s) => PERMS_VIDEO.includes(s));
      meta.permisos_video_presentes = (d.scopes || []).filter((s) => PERMS_VIDEO.includes(s));
      if (d.error) meta.debug_error = d.error;
    } catch (e) { meta.error = e instanceof Error ? e.message : String(e); }
  }

  return NextResponse.json({ ffmpeg, meta }, { status: 200 });
}
