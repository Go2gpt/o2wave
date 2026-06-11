import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { normalizarMarca } from "@/lib/formatText";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Copia local (packProcessor.ts no se toca): asegura tildes correctas en el
// nombre y, sobre todo, en los hashtags sugeridos.
const INSTRUCCION_TILDES = `IMPORTANTE: respeta SIEMPRE las tildes y diacríticos del nombre de la entidad y del idioma. No escribas 'GeneracionO2', escribe 'GeneraciónO2'. No escribas 'Educacion', escribe 'Educación'. La acentuación es parte de la identidad correcta.`;

const MAX_TEXT = 14000; // tope por campo enviado al modelo

export async function POST(request: NextRequest) {
  try {
    const { fraseDescriptiva, posts, bio }: { fraseDescriptiva?: string; posts?: string; bio?: string } = await request.json();

    if (!fraseDescriptiva || fraseDescriptiva.trim().length < 10) {
      return NextResponse.json({ error: "Describe en una frase a qué se dedica tu organización." }, { status: 400 });
    }

    const frase = fraseDescriptiva.slice(0, 2000);
    const postsTxt = (posts || "").slice(0, MAX_TEXT);
    const bioTxt = (bio || "").slice(0, MAX_TEXT);

    const prompt = `Eres un analista de marca para o2Wave. A partir de los siguientes textos de una organización, extrae su perfil de comunicación.

REGLAS:
- Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.
- Si un campo NO se puede inferir de los textos, devuelve null (o [] para arrays). NO inventes datos.
- Detecta el idioma predominante de los textos para "idioma_principal".
- Sé conciso y fiel al contenido.
${INSTRUCCION_TILDES}

DESCRIPCIÓN BREVE: ${frase}
POSTS RECIENTES (si hay): ${postsTxt || "(no aportados)"}
BIO O DESCRIPCIÓN (si hay): ${bioTxt || "(no aportada)"}

Estructura EXACTA:
{
  "nombre": "nombre de la organización (o null si no se menciona)",
  "sector": "sector principal (educacion, salud, medio_ambiente, social, cultura, comercio, tecnologia, deporte, general)",
  "mision_valores": "misión y valores en 2-3 frases (max 500 caracteres)",
  "publico_objetivo": "a quién se dirige (max 300)",
  "servicios_programas": "servicios o programas principales (max 300)",
  "causas_o_productos": "causas (si ONG) o productos/servicios (si empresa) (max 300)",
  "temas_prioritarios": ["3-6 temas que más comunica"],
  "tipo_publicaciones": "una de: Informativas, Emotivas, Llamada a la acción, Motivacionales, Una mezcla de varias",
  "tono": "tono de voz detectado en 2-4 palabras (ej: cercano y motivador)",
  "idioma_principal": "es | ca | en",
  "hashtags_sugeridos": ["5-8 hashtags con # y tildes correctas"],
  "geografia": "ámbito: local, nacional, internacional, países/regiones",
  "estilo_visual": "minimalista, colorido, fotográfico, ilustrado, etc.",
  "logros_numeros": "logros, números clave, años, premios (null si no hay)"
}`;

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
      return NextResponse.json({ error: "No se pudo interpretar el análisis. Inténtalo de nuevo." }, { status: 502 });
    }

    // Regla de marca: "O2" → "o2" en el nombre.
    if (typeof analysis.nombre === "string") analysis.nombre = normalizarMarca(analysis.nombre);
    // Colores no son inferibles desde texto plano (sin web).
    analysis.colores_marca = [];

    return NextResponse.json({ suficiente: true, analysis });
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : "desconocido"}` },
      { status: 500 }
    );
  }
}
