import sharp from "sharp";
import path from "path";
import fs from "fs";
import * as opentype from "opentype.js";

// Cargamos la fuente UNA vez (module scope) con opentype.js. Renderizamos el
// texto como PATHS vectoriales (geometrías), así NO dependemos de que librsvg
// cargue fuentes (ni Pango/fontconfig ni @font-face vía data URL, que fallan en
// Vercel Lambda y producían "tofu" □□□).
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf");
const _fontBuf = fs.readFileSync(FONT_PATH);
// parse() en vez de loadSync() (deprecado en v2 y devuelve undefined).
const FONT = opentype.parse(_fontBuf.buffer.slice(_fontBuf.byteOffset, _fontBuf.byteOffset + _fontBuf.byteLength) as ArrayBuffer);

// Todas las dimensiones de referencia son de 1080px de ancho, así que el
// fontSize (referenciado a 1080) se aplica directo en ambos formatos.
const DIMS: Record<string, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
};

/** Parte el texto en líneas que caben en maxWidth (estimación por ancho de glifo). */
function wrap(text: string, size: number, maxWidth: number): string[] {
  const anchoMedio = size * 0.55; // aprox. para Montserrat Bold
  const maxChars = Math.max(1, Math.floor(maxWidth / anchoMedio));
  const palabras = text.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const tentativa = actual ? `${actual} ${p}` : p;
    if (tentativa.length > maxChars && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = tentativa;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [text];
}

/** Ancho de una línea sumando el avance de cada glifo (escalado a `size`). */
function anchoLinea(linea: string, size: number): number {
  const scale = size / FONT.unitsPerEm;
  let w = 0;
  for (const ch of linea) w += (FONT.charToGlyph(ch).advanceWidth ?? 0) * scale;
  return w;
}

/**
 * Renderiza el texto como PNG vía SVG, maquetando GLIFO A GLIFO con opentype.js
 * (charToGlyph + glyph.getPath). Evitamos font.getPath() porque dispara el motor
 * de features GSUB (ccmp) que esta Montserrat usa con un formato no soportado
 * por opentype.js 2.x. Los acentos/ñ vienen como glifos precompuestos del cmap.
 */
async function renderText(text: string, color: string, size: number, maxWidth: number): Promise<Buffer> {
  const lineas = wrap(text, size, maxWidth);
  const lineHeight = Math.round(size * 1.25);
  const svgWidth = maxWidth;
  const svgHeight = Math.round((lineas.length - 1) * lineHeight + size * 1.3);
  const scale = size / FONT.unitsPerEm;

  const full = new opentype.Path();
  lineas.forEach((linea, i) => {
    let penX = Math.max(0, (svgWidth - anchoLinea(linea, size)) / 2); // centrado horizontal
    const y = size + i * lineHeight;                                  // baseline de cada línea
    for (const ch of linea) {
      const g = FONT.charToGlyph(ch);
      full.extend(g.getPath(penX, y, size));
      penX += (g.advanceWidth ?? 0) * scale;
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}"><g fill="${color}">${full.toSVG(2)}</g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export interface ComposeOptions {
  imageBuffer: Buffer;
  headline: string | null;
  positionX: number; // 0-100, centro del texto
  positionY: number; // 0-100, centro del texto
  fontSize: number;  // px referenciado a 1080
  aspectRatio: string;
}

/**
 * Estampa un titular (blanco, con sombra, sobre franja degradada que sigue al
 * texto) en la posición y tamaño indicados. Si headline es vacío, devuelve la
 * imagen sin tocar (solo normalizada a las dimensiones del formato).
 */
export async function composeImage({
  imageBuffer, headline, positionX, positionY, fontSize, aspectRatio,
}: ComposeOptions): Promise<Buffer> {
  const { w: width, h: height } = DIMS[aspectRatio] || DIMS["1:1"];
  const base = sharp(imageBuffer).resize(width, height, { fit: "cover" });

  if (!headline || !headline.trim()) {
    return base.png().toBuffer();
  }

  const maxTextWidth = width - 160;
  const size = Math.max(20, Math.min(120, Math.round(fontSize)));

  const blanco = await renderText(headline, "#FFFFFF", size, maxTextWidth);
  const negro = await renderText(headline, "#000000", size, maxTextWidth);
  const sombra = await sharp(negro).blur(4).toBuffer();

  const meta = await sharp(blanco).metadata();
  const Tw = meta.width || maxTextWidth;
  const Th = meta.height || size;

  // Centro del texto (clamp para que no se salga)
  let cx = (positionX / 100) * width;
  let cy = (positionY / 100) * height;
  cx = Math.max(Tw / 2, Math.min(width - Tw / 2, cx));
  cy = Math.max(Th / 2, Math.min(height - Th / 2, cy));
  const left = Math.round(cx - Tw / 2);
  const top = Math.round(cy - Th / 2);

  // Franja degradada centrada en el texto
  const bandH = Math.min(height, Th + 160);
  const bandTop = Math.max(0, Math.round(cy - bandH / 2));
  const banda = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient></defs>
    <rect x="0" y="${bandTop}" width="${width}" height="${bandH}" fill="url(#g)"/>
  </svg>`;

  return base
    .composite([
      { input: Buffer.from(banda), top: 0, left: 0 },
      { input: sombra, top, left },
      { input: blanco, top, left },
    ])
    .png()
    .toBuffer();
}
