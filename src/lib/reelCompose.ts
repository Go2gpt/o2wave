import { spawn } from "child_process";
import { promises as fs, existsSync, chmodSync } from "fs";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

/**
 * Compone el Reel final con ffmpeg: superpone el overlay de texto (PNG con alfa,
 * escalado al tamaño del vídeo) sobre el vídeo base y le añade la música (con
 * fade-out). El texto va NÍTIDO por encima (no deformado por el modelo de vídeo).
 * Escribe temporales en el tmpdir del sistema y los limpia. Solo servidor.
 */
export async function componerReel(
  videoBuffer: Buffer,
  overlayPng: Buffer,
  musicBuffer: Buffer | null,
): Promise<{ buffer: Buffer } | { error: string }> {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    return { error: `ffmpeg no encontrado en el servidor (bin: ${ffmpegPath || "null"}).` };
  }
  // En serverless (Vercel) el binario a veces pierde el bit de ejecución al empaquetarse.
  try { chmodSync(ffmpegPath, 0o755); } catch { /* no crítico */ }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "reel-"));
  const vIn = path.join(dir, "in.mp4");
  const oIn = path.join(dir, "ov.png");
  const aIn = path.join(dir, "music.mp3");
  const out = path.join(dir, "out.mp4");
  try {
    await fs.writeFile(vIn, videoBuffer);
    await fs.writeFile(oIn, overlayPng);
    const hasAudio = !!musicBuffer && musicBuffer.length > 0;
    if (hasAudio) await fs.writeFile(aIn, musicBuffer!);

    const args = ["-y", "-i", vIn, "-i", oIn];
    if (hasAudio) args.push("-i", aIn);
    // Escala el overlay al tamaño exacto del vídeo (scale2ref) y lo superpone.
    args.push("-filter_complex", "[1:v][0:v]scale2ref[ov][base];[base][ov]overlay=0:0:format=auto[v]", "-map", "[v]");
    if (hasAudio) {
      // Música: la corta a la duración del vídeo (-shortest) con fade-out al final.
      args.push("-map", "2:a", "-c:a", "aac", "-b:a", "128k", "-af", "afade=t=out:st=4:d=1", "-shortest");
    }
    args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out);

    let stderrTail = "";
    let spawnErr = "";
    const code = await new Promise<number>((resolve) => {
      const p = spawn(ffmpegPath as string, args);
      let err = "";
      p.stderr.on("data", (d) => { err += d.toString(); });
      p.on("error", (e) => { spawnErr = e instanceof Error ? e.message : String(e); resolve(1); });
      p.on("close", (c) => { stderrTail = err.slice(-500); if (c !== 0) console.error("ffmpeg reel:", err.slice(-1000)); resolve(c ?? 1); });
    });
    if (code !== 0) return { error: `ffmpeg falló (${spawnErr || `code ${code}`}): ${stderrTail}`.trim() };

    const buffer = await fs.readFile(out);
    return { buffer };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "error de composición" };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
