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

const MIN_FONT_SIZE = 32; // px (ref. 1080) — por debajo no reducimos más
const MAX_LINEAS = 3;

/** Ancho real de un texto sumando el avance de cada glifo (escalado a fontSize). */
function medirAncho(text: string, fontSize: number): number {
  const scale = fontSize / FONT.unitsPerEm;
  let total = 0;
  for (const ch of text) total += (FONT.charToGlyph(ch).advanceWidth ?? 0) * scale;
  return total;
}

interface LayoutTitular { lineas: string[]; fontSize: number; }

/** Word wrap "duro" a un tamaño fijo (sin reducir más): nunca trunca, acepta el resultado. */
function layoutForzar(text: string, maxWidth: number, fontSize: number): LayoutTitular {
  const palabras = text.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (!actual || medirAncho(candidata, fontSize) <= maxWidth) {
      actual = candidata; // si la línea está vacía, metemos la palabra aunque desborde
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return { lineas: lineas.length ? lineas : [text], fontSize };
}

/**
 * Word wrap REAL (greedy, midiendo ancho con opentype) con auto-shrink:
 * - parte por palabras; si una palabra sola desborda el canvas, reduce fontSize.
 * - si salen más de MAX_LINEAS líneas, reduce fontSize.
 * - suelo en MIN_FONT_SIZE (a partir de ahí, wrap duro sin truncar).
 */
function layoutTitular(text: string, maxWidth: number, fontSize: number): LayoutTitular {
  if (fontSize <= MIN_FONT_SIZE) return layoutForzar(text, maxWidth, MIN_FONT_SIZE);

  const palabras = text.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (medirAncho(candidata, fontSize) <= maxWidth) {
      actual = candidata;
    } else {
      if (actual) lineas.push(actual);
      if (medirAncho(palabra, fontSize) <= maxWidth) {
        actual = palabra;
      } else {
        return layoutTitular(text, maxWidth, fontSize - 2); // palabra única desborda → encoge
      }
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > MAX_LINEAS) return layoutTitular(text, maxWidth, fontSize - 2);
  return { lineas, fontSize };
}

/**
 * Serializa un Path de opentype a un atributo `d` con ESPACIOS explícitos entre
 * cada número y comando. CRÍTICO: el `toSVG()`/`toPathData()` de opentype empaqueta
 * tokens como "52.62Q17.52" (número pegado al comando) que el librsvg de sharp en
 * Vercel mal-parsea → trunca el path o rompe glifos sueltos. Con separadores
 * explícitos el parseo es robusto.
 */
function pathD(p: opentype.Path): string {
  const r = (v: number | undefined) => Math.round((v ?? 0) * 100) / 100;
  let d = "";
  for (const c of p.commands) {
    if (c.type === "M") d += `M ${r(c.x)} ${r(c.y)} `;
    else if (c.type === "L") d += `L ${r(c.x)} ${r(c.y)} `;
    else if (c.type === "C") d += `C ${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)} `;
    else if (c.type === "Q") d += `Q ${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)} `;
    else if (c.type === "Z") d += "Z ";
  }
  return d.trim();
}

/**
 * Renderiza las líneas ya calculadas como PNG vía SVG, maquetando GLIFO A GLIFO
 * con opentype.js (charToGlyph + glyph.getPath). Evitamos font.getPath() porque
 * dispara el motor GSUB (ccmp) que esta Montserrat usa con un formato no soportado
 * por opentype.js 2.x. El SVG se ajusta a la línea más ancha → nunca recorta.
 * Cada línea es un <path> con `d` serializado a mano (ver pathD).
 */
function renderLineas(lineas: string[], fontSize: number, color: string): Promise<Buffer> {
  const scale = fontSize / FONT.unitsPerEm;
  const lineHeight = Math.round(fontSize * 1.25);
  const anchos = lineas.map((l) => medirAncho(l, fontSize));
  const svgWidth = Math.max(1, Math.ceil(Math.max(...anchos)));
  const svgHeight = Math.round((lineas.length - 1) * lineHeight + fontSize * 1.3);

  const paths: string[] = [];
  lineas.forEach((linea, i) => {
    const full = new opentype.Path();
    let penX = (svgWidth - anchos[i]) / 2; // centrado horizontal de cada línea
    const y = fontSize + i * lineHeight;   // baseline de cada línea
    for (const ch of linea) {
      const g = FONT.charToGlyph(ch);
      full.extend(g.getPath(penX, y, fontSize));
      penX += (g.advanceWidth ?? 0) * scale;
    }
    const d = pathD(full);
    if (d) paths.push(`<path d="${d}"/>`);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}"><g fill="${color}">${paths.join("")}</g></svg>`;
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
  const size = Math.max(MIN_FONT_SIZE, Math.min(120, Math.round(fontSize)));

  // Calculamos el layout (word wrap real + auto-shrink) UNA vez y lo compartimos
  // entre el texto blanco y su sombra negra → geometría idéntica.
  const { lineas, fontSize: sizeFinal } = layoutTitular(headline, maxTextWidth, size);
  const blanco = await renderLineas(lineas, sizeFinal, "#FFFFFF");
  const negro = await renderLineas(lineas, sizeFinal, "#000000");
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
