import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

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
 * Genera imagen con OpenAI gpt-image-2 (quality high, tamaño grande). Si el modelo
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
        body: JSON.stringify({ model, prompt, n: 1, size, quality: "high" }),
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

/** Resultado de la edición con foto: imagen lista, o un código de error clasificado. */
export type EditCode = "content_policy" | "invalid_image" | "generic";
export type EditResult = { buffer: Buffer; fuente: string } | { error: EditCode };

/** Clasifica el body de error de OpenAI en una categoría accionable para el usuario. */
function clasificarErrorEdit(body: string): EditCode {
  const b = body.toLowerCase();
  if (/content_policy_violation|safety|moderation_blocked|content policy|rejected as a result/.test(b)) return "content_policy";
  if (/invalid_image|unsupported|invalid base64|image_parse_error|could not process image|invalid file format|unsupported_format/.test(b)) return "invalid_image";
  return "generic";
}

/**
 * Recorta un cuadrado central (~60% de la dimensión menor) ligeramente desplazado
 * hacia arriba, donde suele estar el rostro. Quita al modelo el contexto del
 * fondo/cuerpo/escena original para que respete el prompt. Heurística simple sin
 * detección de caras: cubre el ~80% del beneficio. Si falla, devuelve el original.
 */
async function recortarRostro(buffer: Buffer): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0, h = meta.height ?? 0;
    if (!w || !h) return { buffer, mime: "image/jpeg" };
    const side = Math.max(1, Math.round(Math.min(w, h) * 0.6));
    const left = Math.max(0, Math.min(w - side, Math.round((w - side) / 2)));
    // Sesgo hacia arriba (0.38) para encuadrar mejor la cara en retratos verticales.
    const top = Math.max(0, Math.min(h - side, Math.round((h - side) * 0.38)));
    const out = await sharp(buffer).extract({ left, top, width: side, height: side }).jpeg({ quality: 92 }).toBuffer();
    console.log(`imageGen edit: foto recortada a ${side}x${side} (de ${w}x${h})`);
    return { buffer: out, mime: "image/jpeg" };
  } catch (e) {
    console.warn("imageGen edit: crop falló, uso la foto original:", e instanceof Error ? e.message : e);
    return { buffer, mime: "image/jpeg" };
  }
}

/**
 * Pro: integra una FOTO del usuario en la escena descrita por el prompt, usando
 * el endpoint de edición de imágenes de OpenAI (images.edit, multipart). Intenta
 * gpt-image-2 y cae a gpt-image-1. Devuelve el PNG + el modelo, o un {error}
 * clasificado (content_policy / invalid_image / generic).
 * `scenePrompt` debe ser el prompt de escena en inglés (sin la persona).
 */
export async function generarImagenIAConFoto(
  scenePrompt: string,
  foto: { buffer: Buffer; mime: string },
  aspect: string,
): Promise<EditResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("imageGen: sin OPENAI_API_KEY"); return { error: "generic" }; }
  // Instrucciones explícitas: la foto se usa SOLO para la identidad facial; la
  // escena/fondo/luz/ropa deben seguir la descripción del usuario, reemplazando
  // por completo el entorno original de la foto de referencia.
  const prompt = `IMPORTANT INSTRUCTIONS FOR IMAGE GENERATION:

- Use the reference image ONLY to preserve the person's facial identity (face, hair, glasses, beard, distinctive features).
- The scene, background, lighting, props, and clothing must follow the user's description below precisely.
- DO NOT keep any elements (background, lighting, environment) from the reference photo's original setting.
- The person should be naturally integrated into the new scene as described.
- Photorealistic style unless the user explicitly requests otherwise.

USER'S DESIRED SCENE:
${scenePrompt}

The reference image shows ONLY a face. Build the entire scene, body, clothing, props, and background from scratch following the user's description.

REMEMBER: Replace the original background/environment completely with the scene described above. Only the person's face and identity should be preserved from the reference image.`;
  // Recortamos al rostro: así el modelo no arrastra fondo/escena de la foto y
  // deja que el prompt mande sobre la composición.
  const recortada = await recortarRostro(foto.buffer);
  const imgBuffer = recortada.buffer, imgMime = recortada.mime;
  const ext = imgMime === "image/jpeg" ? "jpg" : "png";
  // Construye el payload. input_fidelity "low" baja el peso de la imagen de
  // referencia para que prime el prompt (default en gpt-image-1, pero explícito).
  const construirFd = (model: string, conFidelity: boolean) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    fd.append("size", sizeOpenAI(model, aspect));
    fd.append("quality", "high");
    fd.append("n", "1");
    if (conFidelity) fd.append("input_fidelity", "low");
    fd.append("image", new Blob([new Uint8Array(imgBuffer)], { type: imgMime }), `foto.${ext}`);
    return fd;
  };
  const enviar = (fd: FormData) => fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` }, // sin Content-Type: fetch pone el boundary
    body: fd,
  });

  for (const model of ["gpt-image-2", "gpt-image-1"]) {
    try {
      const size = sizeOpenAI(model, aspect);
      let res = await enviar(construirFd(model, true));
      if (!res.ok) {
        let body = await res.text();
        // Si el modelo no acepta input_fidelity, reintenta sin ese parámetro.
        if (res.status === 400 && /input_fidelity/i.test(body)) {
          console.warn(`imageGen edit: ${model} no acepta input_fidelity, reintento sin él`);
          res = await enviar(construirFd(model, false));
          if (res.ok) { /* sigue abajo al parseo */ }
          else body = await res.text();
        }
        if (!res.ok) {
          // Modelo no disponible aún → probar el siguiente (gpt-image-1).
          if ((res.status === 404 || res.status === 400) && /model/i.test(body) && !/image/i.test(body)) {
            console.warn(`imageGen edit: modelo ${model} no disponible (${res.status}), fallback al siguiente`);
            continue;
          }
          // Diagnóstico: logueamos el body COMPLETO del error de OpenAI (Vercel logs).
          console.error(`imageGen edit ${model} ${res.status} — body completo de OpenAI:`, body);
          const code = clasificarErrorEdit(body);
          console.error(`imageGen edit: clasificado como "${code}"`);
          return { error: code };
        }
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json as string | undefined;
      if (!b64) { console.error("imageGen edit: respuesta sin b64_json"); return { error: "generic" }; }
      console.log(`imageGen: OpenAI edit ${model} OK (size ${size})`);
      return { buffer: Buffer.from(b64, "base64"), fuente: `openai:${model}:edit` };
    } catch (e) {
      console.error(`imageGen edit ${model} error:`, e instanceof Error ? e.message : e);
      return { error: "generic" };
    }
  }
  return { error: "generic" };
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
 * Genera imagen con la mejor calidad disponible: OpenAI gpt-image-2 primero;
 * si falla (sin key, timeout, rate-limit, 5xx, etc.) cae a Replicate FLUX 1.1 pro.
 * Devuelve el Buffer de la imagen LIMPIA (sin titular) o null.
 */
export async function generarImagenIA(prompt: string, aspect: string, deadlineMs = 55000): Promise<{ buffer: Buffer; fuente: string } | null> {
  const openai = await generarImagenOpenAI(prompt, aspect);
  if (openai) return { buffer: openai.buffer, fuente: `openai:${openai.modelo}` };
  console.warn("imageGen: OpenAI no devolvió imagen → fallback a Replicate FLUX");
  const flux = await generarImagenReplicate(prompt, aspect, deadlineMs);
  return flux ? { buffer: flux, fuente: "replicate:flux-1.1-pro" } : null;
}
