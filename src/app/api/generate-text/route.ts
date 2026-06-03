import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ContentFormData } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData: ContentFormData = await request.json();
    const { nombreOrganizacion, tipoOrganizacion, redSocial, formatoInstagram,
            entornoTikTok, tema, tono, incluirHashtags, incluirEmojis } = formData;

    const system = `Eres un experto en comunicación para el tercer sector y PYMEs.
Genera contenido auténtico, directo y efectivo para redes sociales.
Adapta el tono y formato exactamente a la red social indicada.
Responde SOLO con el contenido generado, sin explicaciones adicionales.`;

    let prompt: string;
    if (redSocial === "TikTok") {
      prompt = `Script de TikTok para: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema} | Tono: ${tono} | Entorno: ${entornoTikTok || "no especificado"}
${incluirHashtags ? "Incluir hashtags" : ""} ${incluirEmojis ? "Con emojis" : "Sin emojis"}

Estructura:
🎣 GANCHO (3 segundos): [frase impactante]
📖 DESARROLLO (20-40 segundos): [contenido principal]
🎯 CTA: [llamada a la acción]
🎵 MÚSICA SUGERIDA: [estilo]
✨ EFECTOS: [sugerencias]`;
    } else {
      prompt = `Contenido para ${redSocial}${formatoInstagram ? ` (${formatoInstagram})` : ""}:
Organización: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema} | Tono: ${tono}
${incluirHashtags ? "✅ Con hashtags" : "❌ Sin hashtags"} | ${incluirEmojis ? "✅ Con emojis" : "❌ Sin emojis"}
${redSocial === "Instagram" ? "Máximo 150 palabras, impacto visual." : ""}
${redSocial === "Facebook" ? "Hasta 200 palabras, narrativo." : ""}
Texto listo para publicar, sin explicaciones:`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    const texto = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ texto });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: `Error generando texto: ${msg}` }, { status: 500 });
  }
}
