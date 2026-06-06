import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { ContentFormData, GuionTikTok } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Nº de segmentos sugeridos según la duración elegida. */
function segmentosPara(duracion: string): string {
  if (duracion.startsWith("15")) return "1-2 segmentos muy cortos";
  if (duracion.startsWith("60")) return "5-7 segmentos";
  return "3-4 segmentos";
}

/** Parseo robusto: intenta JSON.parse directo y, si falla, extrae el primer {...}. */
function parseJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  }
  return null;
}

/** Normaliza/valida la respuesta de Claude a un GuionTikTok. Devuelve null si no es usable. */
function normalizarGuion(data: unknown): Omit<GuionTikTok, "params"> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const guion = Array.isArray(o.guion) ? o.guion : [];
  if (!guion.length) return null;
  return {
    titular: typeof o.titular === "string" ? o.titular : "",
    guion: guion.map((s) => {
      const seg = (s ?? {}) as Record<string, unknown>;
      return {
        tiempo: String(seg.tiempo ?? ""),
        voz: String(seg.voz ?? ""),
        accion: String(seg.accion ?? ""),
      };
    }),
    planos: (Array.isArray(o.planos) ? o.planos : []).map((p, i) => {
      const pl = (p ?? {}) as Record<string, unknown>;
      return {
        numero: typeof pl.numero === "number" ? pl.numero : i + 1,
        descripcion: String(pl.descripcion ?? ""),
      };
    }),
    hashtags: (Array.isArray(o.hashtags) ? o.hashtags : [])
      .filter((h): h is string => typeof h === "string")
      .map((h) => (h.startsWith("#") ? h : `#${h}`)),
    audio_sugerido: typeof o.audio_sugerido === "string" ? o.audio_sugerido : "",
  };
}

/** Texto plano legible del guion (fallback para copiar/compartir y para la columna texto). */
function guionToText(g: Omit<GuionTikTok, "params">): string {
  const lineas: string[] = [];
  if (g.titular) lineas.push(`🎬 ${g.titular}`, "");
  lineas.push("📜 GUION");
  g.guion.forEach((s) => {
    lineas.push(`[${s.tiempo}] ${s.voz}${s.accion ? `\n   → ${s.accion}` : ""}`);
  });
  if (g.planos.length) {
    lineas.push("", "🎬 PLANOS A GRABAR");
    g.planos.forEach((p) => lineas.push(`${p.numero}. ${p.descripcion}`));
  }
  if (g.audio_sugerido) lineas.push("", `🎵 AUDIO: ${g.audio_sugerido}`);
  if (g.hashtags.length) lineas.push("", g.hashtags.join(" "));
  return lineas.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const formData: ContentFormData = await request.json();
    const { nombreOrganizacion, tipoOrganizacion, redSocial, formatoInstagram,
            entornoTikTok, duracionTikTok, tonoTikTok, tema, tono,
            incluirHashtags, incluirEmojis } = formData;

    // Contexto del usuario (sector/misión/público) para enriquecer la generación.
    let contextoUsuario = "";
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("sector, mision_valores, publico_objetivo")
          .eq("id", user.id)
          .single();
        contextoUsuario = [
          profile?.sector && `Sector: ${profile.sector}`,
          profile?.mision_valores && `Misión: ${profile.mision_valores}`,
          profile?.publico_objetivo && `Público objetivo: ${profile.publico_objetivo}`,
        ].filter(Boolean).join("\n");
      }
    } catch { /* tolerante: sin contexto extra si falla */ }

    // ---------- TikTok: guion estructurado en JSON ----------
    if (redSocial === "TikTok") {
      const duracion = duracionTikTok || "30s";
      const tonoTk = tonoTikTok || "Cercano";
      const entorno = entornoTikTok || "no especificado";

      const system = `Eres un guionista experto en vídeos cortos para TikTok orientados al tercer sector y PYMEs.
Creas guiones prácticos y grabables con un smartphone y luz natural, sin equipo profesional.
Respondes SIEMPRE y ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown.`;

      const prompt = `Crea un guion de TikTok para "${nombreOrganizacion}" (${tipoOrganizacion}).

PARÁMETROS:
- Tema: ${tema}
- Duración total: ${duracion} → usa ${segmentosPara(duracion)}
- Tono: ${tonoTk} (refléjalo en el vocabulario y la energía del texto)
- Entorno o ubicación de grabación: ${entorno}
${contextoUsuario ? `\nCONTEXTO DE LA ORGANIZACIÓN:\n${contextoUsuario}\n` : ""}
INSTRUCCIONES:
- El guion debe caber en la duración indicada.
- Los planos deben ser PRÁCTICOS para alguien sin equipo (smartphone + luz natural).
- ${incluirHashtags ? "Incluye 10-15 hashtags" : "Incluye 8-12 hashtags"} específicos para TikTok: mezcla virales (#fyp, #parati) con otros relevantes al tema y al sector.
- El audio sugerido NO debe ser una canción concreta (no sabes qué está en tendencia): describe el TIPO de audio que encaja (p. ej. "música instrumental suave tipo Lo-Fi", "audio viral de tendencia con ritmo enérgico", "solo voz, sin música").
${incluirEmojis ? "- Puedes usar emojis con moderación en la voz." : "- No uses emojis."}

Devuelve EXACTAMENTE esta estructura JSON:
{
  "titular": "string corto de 6-10 palabras, para usar como texto sobre la miniatura",
  "guion": [
    { "tiempo": "0-3s", "voz": "lo que se dice a cámara", "accion": "qué se muestra visualmente" }
  ],
  "planos": [
    { "numero": 1, "descripcion": "descripción práctica del plano" }
  ],
  "hashtags": ["#fyp", "#parati"],
  "audio_sugerido": "descripción genérica del tipo de audio"
}`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1600,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
      const guion = normalizarGuion(parseJSON(raw));

      if (guion) {
        return NextResponse.json({
          guion: { ...guion, params: { duracion, tono: tonoTk, entorno } },
          texto: guionToText(guion),
          titular: guion.titular || "",
        });
      }
      // Fallback: el JSON no se pudo estructurar → devolvemos el texto bruto.
      return NextResponse.json({ guion: null, texto: raw.trim(), titular: "" });
    }

    // ---------- Instagram / Facebook: texto plano (como antes) ----------
    const system = `Eres un experto en comunicación para el tercer sector y PYMEs.
Genera contenido auténtico, directo y efectivo para redes sociales.
Adapta el tono y formato exactamente a la red social indicada.
Responde SOLO con el contenido generado, sin explicaciones adicionales.`;

    const prompt = `Contenido para ${redSocial}${formatoInstagram ? ` (${formatoInstagram})` : ""}:
Organización: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema} | Tono: ${tono}
${contextoUsuario ? `\n${contextoUsuario}\n` : ""}${incluirHashtags ? "✅ Con hashtags" : "❌ Sin hashtags"} | ${incluirEmojis ? "✅ Con emojis" : "❌ Sin emojis"}
${redSocial === "Instagram" ? "Máximo 150 palabras, impacto visual." : ""}
${redSocial === "Facebook" ? "Hasta 200 palabras, narrativo." : ""}
Texto listo para publicar, sin explicaciones:`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const texto = response.content[0].type === "text" ? response.content[0].text : "";

    // Titular corto para estampar sobre la imagen.
    const tRes = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 40,
      messages: [{
        role: "user",
        content: `Dame un titular muy corto (máximo 8 palabras), impactante y en castellano, para superponer sobre una imagen de redes sociales de "${nombreOrganizacion}" sobre: ${tema}. Responde SOLO con el titular, sin comillas ni explicaciones.`,
      }],
    });
    const titular = (tRes.content[0].type === "text" ? tRes.content[0].text : "").trim().replace(/^["'«»]|["'«»]$/g, "");

    return NextResponse.json({ texto, titular });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: `Error generando texto: ${msg}` }, { status: 500 });
  }
}
