import type { ContentRequest } from "@/types";
import { PLATFORM_LIMITS } from "./utils";

export function buildContentPrompt(req: ContentRequest): string {
  const limit = req.wordLimit ?? PLATFORM_LIMITS[req.platform];
  const orgTypeLabel = req.orgType === "ong" ? "ONG (organización sin fines de lucro)" : "PYME (pequeña o mediana empresa)";

  return `Eres un experto en marketing digital para ${orgTypeLabel}s en América Latina.

Genera contenido para redes sociales con estas especificaciones:
- Organización: ${req.orgName} (${orgTypeLabel})
- Plataforma: ${req.platform} (máximo ${limit} caracteres)
- Tono: ${req.tone}
- Tema: ${req.topic}
- Incluir hashtags: ${req.includeHashtags ? "sí" : "no"}
- Incluir emojis: ${req.includeEmoji ? "sí" : "no"}

Tu respuesta debe ser EXCLUSIVAMENTE el objeto JSON, sin bloques de código, sin explicaciones, sin texto adicional antes ni después:
{"content": "el texto del post listo para publicar", "hashtags": ["hashtag1", "hashtag2"]}

El campo "hashtags" debe ser un array vacío [] si no se pidieron hashtags.`;
}
