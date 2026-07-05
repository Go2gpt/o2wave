import crypto from "crypto";

/**
 * Cifrado simétrico de tokens de acceso (Meta) para guardarlos en BBDD.
 * AES-256-GCM con clave en env (TOKEN_ENC_KEY, 32 bytes en base64).
 * Formato almacenado: base64(iv):base64(tag):base64(ciphertext).
 * Solo servidor — nunca importar en el cliente.
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) throw new Error("Falta TOKEN_ENC_KEY (32 bytes en base64).");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENC_KEY debe decodificar a 32 bytes (base64).");
  return key;
}

export function cifrarToken(plano: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function descifrarToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Token cifrado con formato inválido.");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
