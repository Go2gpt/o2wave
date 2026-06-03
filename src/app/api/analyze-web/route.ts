import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { url }: { url: string } = await request.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    const prompt = `Analiza la identidad visual de esta web: ${normalizedUrl}

Basándote en la URL y el dominio, deduce la identidad visual probable de esta organización.
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "nombre": "nombre probable de la organización",
  "tipo": "ong" o "pyme" o "autonomo",
  "sector": "sector principal (ej: educacion, salud, medio_ambiente, comercio, tecnologia, cultura, social)",
  "colores": ["#hexcolor1", "#hexcolor2", "#hexcolor3"],
  "tipografia": "nombre de fuente probable (ej: Roboto, Open Sans, Montserrat)",
  "estilo": "descripción del estilo visual en 10 palabras máximo",
  "descripcion": "descripción de la organización en 20 palabras"
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      // Fallback if parsing fails
      analysis = {
        nombre: "",
        tipo: "ong",
        sector: "general",
        colores: ["#93bf30", "#f9b23b", "#0F0F0F"],
        tipografia: "Montserrat",
        estilo: "moderno y profesional",
        descripcion: "Organización analizada desde " + normalizedUrl,
      };
    }

    return NextResponse.json({ analysis, url: normalizedUrl });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
