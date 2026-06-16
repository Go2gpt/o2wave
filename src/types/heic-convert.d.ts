declare module "heic-convert" {
  interface ConvertOptions {
    buffer: Buffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number; // 0..1 (solo JPEG)
  }
  /** Convierte un buffer HEIC/HEIF a JPEG o PNG. Devuelve el buffer resultante. */
  function convert(options: ConvertOptions): Promise<ArrayBuffer>;
  export default convert;
}
