import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { normalizarMarca } from "@/lib/formatText";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MIN_TEXT = 500;        // umbral de "suficiente"
const MAX_TEXT = 14000;      // tope de texto enviado al modelo

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; o2wave-bot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function findInternalLinks(html: string, baseUrl: string): string[] {
  let origin: string;
  try { origin = new URL(baseUrl).origin; } catch { return []; }
  const kw = ["about", "sobre", "nosotros", "mision", "misi", "quienes", "quiénes",
    "servicios", "que-hacemos", "proyectos", "programa", "valores"];
  const found = new Set<string>();
  const matches = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi));
  for (const m of matches) {
    let abs: string;
    try { abs = new URL(m[1], baseUrl).toString(); } catch { continue; }
    if (!abs.startsWith(origin)) continue;
    if (abs.replace(/\/$/, "") === baseUrl.replace(/\/$/, "")) continue;
    if (kw.some((k) => abs.toLowerCase().includes(k))) found.add(abs);
    if (found.size >= 3) break;
  }
  return Array.from(found);
}

export async function POST(request: NextRequest) {
  try {
    const { url }: { url: string } = await request.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // 1) Home + hasta 3 páginas internas relevantes
    const homeHtml = await fetchHtml(normalizedUrl);
    const internalLinks = homeHtml ? findInternalLinks(homeHtml, normalizedUrl) : [];
    const internalHtml = await Promise.all(internalLinks.map(fetchHtml));

    let texto = [homeHtml, ...internalHtml].map(stripHtml).join("\n\n").trim();
    if (texto.length > MAX_TEXT) texto = texto.slice(0, MAX_TEXT);

    // 2) Texto insuficiente → el frontend preguntará a mano
    if (texto.length < MIN_TEXT) {
      return NextResponse.json({ suficiente: false, url: normalizedUrl });
    }

    // Tipo de entidad (server-side) para adaptar el prompt.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let esEmpresa = false;
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("tipo_entidad").eq("id", user.id).single();
      esEmpresa = prof?.tipo_entidad === "empresa";
    }
    const ente = esEmpresa ? "empresa" : "organización";

    // 3) Análisis exhaustivo con Claude
    const prompt = `Eres un analista de marca. A partir del TEXTO extraído de la web de una ${ente}, devuelve un análisis en JSON.

REGLAS:
- Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.
- Si un campo NO se puede inferir del texto, devuelve null (o [] para arrays). NO inventes datos.
- NOMBRE: si el TEXTO no contiene un nombre propio claro y explícito de la ${ente}, devuelve "" (string vacío). NO inventes ni infieras un nombre.
- Sé conciso y fiel al contenido.

Estructura EXACTA:
{
  "nombre": "nombre propio SOLO si aparece explícito en el TEXTO; si no, ''",
  "tipo": "ong" | "empresa" | "autonomo",
  "sector": "sector principal (educacion, salud, medio_ambiente, social, cultura, comercio, tecnologia, deporte, general)",
  "mision_valores": "misión y valores en 2-3 frases",
  "publico_objetivo": "a quién se dirige",
  "servicios_programas": "servicios o programas principales",
  "causas_o_productos": "causas (si ONG) o productos/servicios (si empresa)",
  "colores_marca": ["#hex", "..."],
  "idioma_principal": "es" | "ca" | "en" | "...",
  "hashtags_sugeridos": ["#tag1", "#tag2"],
  "geografia": "ámbito: local, nacional, internacional, países/regiones",
  "estilo_visual": "minimalista, colorido, fotográfico, ilustrado, etc.",
  "logros_numeros": "logros, números clave, años, premios"
}

TEXTO DE LA WEB (${normalizedUrl}):
"""
${texto}
"""`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ suficiente: false, url: normalizedUrl });
    }

    // Anti-invención: si el nombre devuelto NO aparece literalmente en el texto
    // de la web, lo consideramos inventado y lo vaciamos. Si aparece, normalizamos marca.
    if (typeof analysis.nombre === "string" && analysis.nombre.trim()) {
      analysis.nombre = texto.toLowerCase().includes(analysis.nombre.trim().toLowerCase())
        ? normalizarMarca(analysis.nombre)
        : "";
    } else {
      analysis.nombre = "";
    }

    return NextResponse.json({ suficiente: true, analysis, url: normalizedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : "desconocido"}` },
      { status: 500 }
    );
  }
}
