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
function renderLineas(lineas: string[], fontSize: number, color: string, align: "left" | "center" | "right" = "center"): Promise<Buffer> {
  const scale = fontSize / FONT.unitsPerEm;
  const lineHeight = Math.round(fontSize * 1.25);
  const anchos = lineas.map((l) => medirAncho(l, fontSize));
  const svgWidth = Math.max(1, Math.ceil(Math.max(...anchos)));
  const svgHeight = Math.round((lineas.length - 1) * lineHeight + fontSize * 1.3);

  const paths: string[] = [];
  lineas.forEach((linea, i) => {
    const full = new opentype.Path();
    // Alineación de cada línea dentro del bloque (svgWidth = línea más ancha).
    let penX = align === "left" ? 0 : align === "right" ? (svgWidth - anchos[i]) : (svgWidth - anchos[i]) / 2;
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

/**
 * Marca de agua "✨ Gen. IA" (destello vectorial + texto, glifos como paths para
 * evitar tofu). Devuelve el SVG y sus dimensiones. fill-opacity para discreción.
 */
function watermarkSVG(fs: number, color: string, opacity: number): { svg: string; w: number; h: number } {
  const text = "Gen. IA";
  const scale = fs / FONT.unitsPerEm;
  const textW = Math.ceil(medirAncho(text, fs));
  const starBox = Math.round(fs * 0.95);
  const gap = Math.round(fs * 0.3);
  const h = Math.round(fs * 1.3);
  const w = starBox + gap + textW;
  // Destello de 4 puntas (sparkle) centrado verticalmente.
  const cx = starBox / 2, cy = h / 2, R = starBox / 2, r = R * 0.3;
  const star = `M ${cx} ${cy - R} L ${cx + r} ${cy - r} L ${cx + R} ${cy} L ${cx + r} ${cy + r} L ${cx} ${cy + R} L ${cx - r} ${cy + r} L ${cx - R} ${cy} L ${cx - r} ${cy - r} Z`;
  // Texto "Gen. IA" glifo a glifo (baseline ≈ fs).
  const full = new opentype.Path();
  let penX = starBox + gap;
  for (const ch of text) { const g = FONT.charToGlyph(ch); full.extend(g.getPath(penX, fs, fs)); penX += (g.advanceWidth ?? 0) * scale; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g fill="${color}" fill-opacity="${opacity}"><path d="${star}"/><path d="${pathD(full)}"/></g></svg>`;
  return { svg, w, h };
}

/** Genera los inputs (sombra + blanco) de la marca de agua, anclados abajo-derecha. */
async function watermarkComposites(width: number, height: number): Promise<sharp.OverlayOptions[]> {
  const fs = Math.max(22, Math.round(height * 0.034)); // ~3.4% de la altura
  const blanco = watermarkSVG(fs, "#FFFFFF", 0.85);
  const negro = watermarkSVG(fs, "#000000", 0.5);
  const wmWhite = await sharp(Buffer.from(blanco.svg)).png().toBuffer();
  const wmShadow = await sharp(Buffer.from(negro.svg)).png().blur(2).toBuffer();
  const pad = Math.round(height * 0.025);
  const left = Math.max(0, width - blanco.w - pad);
  const top = Math.max(0, height - blanco.h - pad);
  return [
    { input: wmShadow, top: top + 2, left: left + 2 },
    { input: wmWhite, top, left },
  ];
}

export interface ComposeOptions {
  imageBuffer: Buffer;
  headline: string | null;
  positionX: number; // 0-100, centro del texto (solo aplica a align "center")
  positionY: number; // 0-100, centro del texto
  fontSize: number;  // px referenciado a 1080
  aspectRatio: string;
  textAlign?: "left" | "center" | "right";
}

/**
 * Estampa un titular (blanco, con sombra, sobre franja degradada que sigue al
 * texto) en la posición y tamaño indicados. Si headline es vacío, devuelve la
 * imagen sin tocar (solo normalizada a las dimensiones del formato).
 */
export async function composeImage({
  imageBuffer, headline, positionX, positionY, fontSize, aspectRatio, textAlign = "center",
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
  const blanco = await renderLineas(lineas, sizeFinal, "#FFFFFF", textAlign);
  const negro = await renderLineas(lineas, sizeFinal, "#000000", textAlign);
  const sombra = await sharp(negro).blur(4).toBuffer();

  const meta = await sharp(blanco).metadata();
  const Tw = meta.width || maxTextWidth;
  const Th = meta.height || size;

  // Vertical: siempre por positionY (arrastre). Horizontal: izquierda/derecha
  // se anclan al borde (con padding); centro respeta el arrastre positionX.
  const padX = Math.round(width * 0.075);
  let cy = (positionY / 100) * height;
  cy = Math.max(Th / 2, Math.min(height - Th / 2, cy));
  let left: number;
  if (textAlign === "left") left = padX;
  else if (textAlign === "right") left = Math.max(padX, width - Tw - padX);
  else {
    let cx = (positionX / 100) * width;
    cx = Math.max(Tw / 2, Math.min(width - Tw / 2, cx));
    left = Math.round(cx - Tw / 2);
  }
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

  // Marca de agua "✨ Gen. IA" abajo-derecha: solo cuando hay composición IA
  // (esta rama). Una imagen subida sin titular sale por el return anterior sin marca.
  const wm = await watermarkComposites(width, height);

  return base
    .composite([
      { input: Buffer.from(banda), top: 0, left: 0 },
      { input: sombra, top, left },
      { input: blanco, top, left },
      ...wm,
    ])
    .png()
    .toBuffer();
}
