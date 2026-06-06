import sharp from "sharp";
import path from "path";

const FONT = path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf");

function escapePango(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Elige el tamaño de fuente (60→36) para que el titular quepa en maxLines. */
function chooseSize(text: string, maxWidth: number, maxLines: number): number {
  const words = text.trim().split(/\s+/);
  for (let size = 60; size >= 36; size -= 2) {
    const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.56)));
    let lines = 1, cur = 0;
    for (const w of words) {
      const add = (cur ? 1 : 0) + w.length;
      if (cur + add <= maxChars) cur += add;
      else { lines++; cur = w.length; }
    }
    if (lines <= maxLines) return size;
  }
  return 36;
}

/** Renderiza el titular como imagen RGBA (texto centrado, con auto-wrap a maxWidth). */
async function renderText(text: string, color: string, size: number, maxWidth: number): Promise<Buffer> {
  return sharp({
    text: {
      text: `<span foreground="${color}">${escapePango(text)}</span>`,
      fontfile: FONT,
      font: `Montserrat Bold ${size}`,
      width: maxWidth,
      rgba: true,
      align: "centre",
    },
  }).png().toBuffer();
}

/**
 * Compone un titular centrado (blanco, con sombra) sobre una franja degradada
 * para legibilidad. Devuelve un PNG de las dimensiones indicadas.
 */
export async function composeHeadline(
  imageBuffer: Buffer,
  headline: string,
  width: number,
  height: number,
  maxLines: number
): Promise<Buffer> {
  const padding = 80;
  const maxTextWidth = width - padding * 2;
  const size = chooseSize(headline, maxTextWidth, maxLines);

  const blanco = await renderText(headline, "#FFFFFF", size, maxTextWidth);
  const negro = await renderText(headline, "#000000", size, maxTextWidth);
  const sombra = await sharp(negro).blur(4).toBuffer();

  const gradiente = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="franja" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="30%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="50%" stop-color="#000000" stop-opacity="0.55"/>
        <stop offset="70%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#franja)"/>
  </svg>`;

  return sharp(imageBuffer)
    .resize(width, height, { fit: "cover" })
    .composite([
      { input: Buffer.from(gradiente), top: 0, left: 0 },
      { input: sombra, gravity: "centre" },
      { input: blanco, gravity: "centre" },
    ])
    .png()
    .toBuffer();
}
