import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { FormData } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json();

    const {
      nombreOrganizacion,
      tipoOrganizacion,
      redSocial,
      formatoInstagram,
      entornoTikTok,
      tema,
      tono,
      incluirHashtags,
      incluirEmojis,
    } = formData;

    const systemPrompt = `Eres un experto en comunicación para el tercer sector y PYMEs.
Genera contenido auténtico, directo y efectivo para redes sociales.
Adapta el tono y formato exactamente a la red social indicada.
Responde SOLO con el contenido generado, sin explicaciones adicionales ni metadatos.`;

    let userPrompt: string;

    if (redSocial === "TikTok") {
      userPrompt = `Genera un script de TikTok para la siguiente publicación:

Organización: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema}
Tono: ${tono}
Entorno/ubicación: ${entornoTikTok || "No especificado"}
${incluirHashtags ? "Incluir hashtags relevantes al final" : ""}
${incluirEmojis ? "Usar emojis estratégicamente" : "Sin emojis"}

Estructura el script así:
🎣 GANCHO (primeros 3 segundos):
[Frase de apertura impactante que detenga el scroll]

📖 DESARROLLO (20-40 segundos):
[Contenido principal con ritmo dinámico, párrafos cortos]

🎯 CTA FINAL:
[Llamada a la acción clara]

🎵 MÚSICA SUGERIDA:
[Estilo o canción sugerida]

✨ EFECTOS/TRANSICIONES:
[Sugerencias de efectos visuales]`;
    } else {
      const formatoInfo = redSocial === "Instagram" && formatoInstagram
        ? ` (formato ${formatoInstagram})`
        : "";

      userPrompt = `Genera contenido para ${redSocial}${formatoInfo}:

Organización: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema}
Tono: ${tono}
${incluirHashtags ? "✅ Incluir hashtags relevantes" : "❌ Sin hashtags"}
${incluirEmojis ? "✅ Usar emojis" : "❌ Sin emojis"}

${redSocial === "Instagram" ? "Adapta el texto para Instagram: máximo 150 palabras, impacto visual del texto." : ""}
${redSocial === "Facebook" ? "Para Facebook: puedes ser más extenso (hasta 200 palabras), más narrativo y con contexto." : ""}

Genera el texto listo para publicar, sin explicaciones adicionales.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ texto: text });
  } catch (error) {
    console.error("Error generating text:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error generando el texto: ${message}` },
      { status: 500 }
    );
  }
}
