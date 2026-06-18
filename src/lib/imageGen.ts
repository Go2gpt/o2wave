import Anthropic from "@anthropic-ai/sdk";

// Construye el prompt de imagen en INGLÉS, fotorrealista/editorial, a partir del
// tema (en español). Describe entidades visuales, no traduce el caption.
const PHOTO_SYSTEM = `Eres director de arte. Devuelve SOLO un prompt en INGLÉS para un modelo de imagen que produzca una FOTOGRAFÍA realista, estilo editorial/documental (NO ilustración, NO abstracto, NO vectorial, NO pastel).
Describe entidades visuales concretas: sujeto, composición/encuadre, luz, ambiente. Para personas usa solo características generales (edad, expresión, contexto, género); NUNCA describas personas reales concretas ni famosos (derecho de imagen). Prohíbe texto, letras y logos.
Estructura: "Photograph of [subject in detail], [composition/framing], documentary editorial style, photorealistic, [lighting], [mood], shot on professional camera, shallow depth of field, no text, no letters, no logos, no watermarks".

Ejemplos del patrón:
- "Close-up photograph of a young hand gently holding the wrinkled hand of an elderly person, documentary editorial style, soft natural lighting, warm and respectful tone, photorealistic, 50mm lens, shallow depth of field, no text, no logos"
- "Photograph of a friendly small business owner welcoming a customer in a small shop, candid editorial style, warm natural light, photorealistic, 35mm lens, no text, no logos"
- "Photograph of hands planting a young tree in healthy soil, close-up, documentary style, golden hour lighting, hopeful mood, photorealistic, no text, no logos"
- "Photograph of a diverse group of women collaborating in a workplace, candid editorial style, natural light, dignified, photorealistic, 35mm lens, no text, no logos"

Responde SOLO con el prompt en inglés, una sola línea, sin comillas ni explicaciones.`;

/** Genera un prompt de imagen en inglés fotorrealista a partir del tema. Tolerante: fallback a plantilla. */
export async function construirImagePromptEN(tema: string, tipo?: string | null): Promise<string> {
  const fallback = `Photograph related to "${tema}", documentary editorial style, photorealistic, natural lighting, shallow depth of field, no text, no letters, no logos, no watermarks`;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 220,
      system: PHOTO_SYSTEM,
      messages: [{ role: "user", content: `Tema del post: "${tema}". Tipo de entidad: ${tipo || "general"}.` }],
    });
    const txt = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return txt.length > 15 ? txt.replace(/^["'`]+|["'`]+$/g, "") : fallback;
  } catch {
    return fallback;
  }
}

// Tamaño máximo soportado por modelo y formato. gpt-image-2 hace cuadrado a 1536²;
// gpt-image-1 se queda en 1024² cuadrado.
function sizeOpenAI(model: string, aspect: string): string {
  if (aspect === "9:16" || aspect === "4:5") return "1024x1536"; // vertical (Story / Post 4:5)
  if (aspect === "16:9") return "1536x1024";
  return model === "gpt-image-2" ? "1536x1536" : "1024x1024";
}

/**
 * Genera imagen con OpenAI gpt-image-2 (quality medium, tamaño grande). Si el modelo
 * no existe (404/400 model_not_found), hace fallback a gpt-image-1 (1024² cuadrado).
 * Devuelve el PNG en Buffer + el modelo servido (para observabilidad), o null.
 */
export async function generarImagenOpenAI(prompt: string, aspect: string): Promise<{ buffer: Buffer; modelo: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("imageGen: sin OPENAI_API_KEY"); return null; }
  for (const model of ["gpt-image-2", "gpt-image-1"]) {
    try {
      const size = sizeOpenAI(model, aspect);
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, n: 1, size, quality: "medium" }),
      });
      if (!res.ok) {
        const body = await res.text();
        // Modelo no disponible aún → probar el siguiente (gpt-image-1).
        if ((res.status === 404 || res.status === 400) && /model/i.test(body)) {
          console.warn(`imageGen: modelo ${model} no disponible (${res.status}), fallback al siguiente`);
          continue;
        }
        console.error(`imageGen openai ${model} ${res.status}: ${body.slice(0, 200)}`);
        return null;
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json as string | undefined;
      if (!b64) { console.error("imageGen openai: respuesta sin b64_json"); return null; }
      console.log(`imageGen: OpenAI ${model} OK (size ${size})`);
      return { buffer: Buffer.from(b64, "base64"), modelo: model };
    } catch (e) {
      console.error(`imageGen openai ${model} error:`, e instanceof Error ? e.message : e);
      return null;
    }
  }
  return null;
}

/**
 * Genera imagen con Google Gemini 2.5 Flash Image (Nano Banana), API v1beta.
 * Aspect ratio nativo por red (4:5 / 9:16 / 16:9 / 1:1); la resolución va auto.
 * Si `foto` viene, se envía como inline_data (image+text→image): integra la
 * persona de la foto en la escena del prompt. Devuelve el Buffer o null.
 */
export async function generarImagenGemini(
  prompt: string,
  aspect: string,
  deadlineMs = 50000,
  foto?: { buffer: Buffer; mime: string },
): Promise<Buffer | null> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) { console.error("imageGen: sin GOOGLE_AI_API_KEY"); return null; }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), deadlineMs);
  try {
    // Con foto: la imagen va PRIMERO en parts, luego el texto de la escena.
    const reqParts = foto
      ? [{ inline_data: { mime_type: foto.mime, data: foto.buffer.toString("base64") } }, { text: prompt }]
      : [{ text: prompt }];
    // v1beta: es donde existen responseModalities + imageConfig (en v1 dan 400).
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: reqParts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: aspect }, // sin imageSize: la resolución va auto según aspect
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Logueamos el body COMPLETO para diagnosticar en Vercel si el shape falla.
      console.error(`imageGen gemini ${res.status}: ${(await res.text()).slice(0, 600)}`);
      return null;
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p?.inlineData ?? p?.inline_data;
      const b64 = inline?.data as string | undefined;
      if (b64) {
        console.log(`imageGen: Gemini OK (aspect ${aspect}, ${inline?.mimeType ?? inline?.mime_type ?? "image"})`);
        return Buffer.from(b64, "base64");
      }
    }
    console.error("imageGen gemini: respuesta sin imagen:", JSON.stringify(data).slice(0, 500));
    return null;
  } catch (e) {
    console.error("imageGen gemini error:", e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Pro/Estrella: integra la cara del usuario en una escena IA con Gemini (Nano
 * Banana, image+text→image). `escena` es el tema del usuario. NO hay fallback a
 * FLUX (no integra cara): si Gemini falla, devolvemos null y el usuario reintenta.
 */
export async function generarImagenIntegrada(
  escena: string,
  foto: { buffer: Buffer; mime: string },
  aspect: string,
  deadlineMs = 60000,
): Promise<{ buffer: Buffer; fuente: string } | null> {
  const prompt = `Integra a la persona de la foto EXACTAMENTE como aparece (mantén su cara, peinado, ropa y rasgos idénticos) en la siguiente escena: ${escena}. Estilo fotográfico realista, sin texto ni logos.`;
  const buf = await generarImagenGemini(prompt, aspect, deadlineMs, foto);
  return buf ? { buffer: buf, fuente: "gemini-2.5-flash-image:integrada" } : null;
}

/** Fallback: Replicate FLUX 1.1 pro (crea predicción, hace polling y descarga). Devuelve Buffer o null. */
export async function generarImagenReplicate(prompt: string, aspect: string, deadlineMs = 55000): Promise<Buffer | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { console.error("imageGen: sin REPLICATE_API_TOKEN"); return null; }
  try {
    const fluxPrompt = `${prompt} Photorealistic, no text, no letters, no logos, clean composition.`;
    const startRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { prompt: fluxPrompt, aspect_ratio: aspect, output_format: "png", safety_tolerance: 2 } }),
    });
    if (!startRes.ok) { console.error(`imageGen replicate create ${startRes.status}`); return null; }
    const id = (await startRes.json()).id as string;
    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const st = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!st.ok) continue;
      const d = await st.json();
      if (d.status === "succeeded") {
        const out = d.output;
        const url = Array.isArray(out) ? out[0] : (typeof out === "string" ? out : null);
        if (!url) return null;
        const img = await fetch(url);
        return Buffer.from(await img.arrayBuffer());
      }
      if (d.status === "failed" || d.status === "canceled") return null;
    }
    return null;
  } catch (e) {
    console.error("imageGen replicate error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Genera imagen con la mejor calidad disponible: Google Gemini 2.5 Flash Image
 * (Nano Banana) primero; si falla (sin key, timeout, rate-limit, 5xx, shape de
 * config inválido, etc.) cae a Replicate FLUX 1.1 pro (con aspect ratio correcto).
 * Devuelve el Buffer de la imagen LIMPIA (sin titular) o null.
 */
export async function generarImagenIA(prompt: string, aspect: string, deadlineMs = 55000): Promise<{ buffer: Buffer; fuente: string } | null> {
  const gemini = await generarImagenGemini(prompt, aspect);
  if (gemini) return { buffer: gemini, fuente: "gemini-2.5-flash-image" };
  console.warn("imageGen: Gemini no devolvió imagen → fallback a Replicate FLUX");
  const flux = await generarImagenReplicate(prompt, aspect, deadlineMs);
  return flux ? { buffer: flux, fuente: "replicate:flux-1.1-pro" } : null;
}
