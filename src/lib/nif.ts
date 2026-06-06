const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const NIE_PREFIX: Record<string, string> = { X: "0", Y: "1", Z: "2" };
const CIF_CONTROL_LETTERS = "JABCDEFGHI";
const CIF_ORG_LETTERS = "ABCDEFGHJNPQRSUVW";

export interface NifResult {
  valido: boolean;
  tipo?: "DNI" | "NIE" | "CIF";
  mensaje?: string;
}

/** Limpia el NIF a su forma canónica: sin espacios y en mayúsculas. */
export function normalizarNIF(nif: string): string {
  return nif.replace(/\s+/g, "").toUpperCase().trim();
}

function validarDNI(v: string): boolean {
  const num = parseInt(v.slice(0, 8), 10);
  return DNI_LETTERS[num % 23] === v[8];
}

function validarNIE(v: string): boolean {
  const num = parseInt(NIE_PREFIX[v[0]] + v.slice(1, 8), 10);
  return DNI_LETTERS[num % 23] === v[8];
}

function validarCIF(v: string): boolean {
  const org = v[0];
  const digits = v.slice(1, 8);
  const control = v[8];

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    let n = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n = Math.floor(n / 10) + (n % 10);
    }
    sum += n;
  }
  const e = (10 - (sum % 10)) % 10;
  const controlDigit = String(e);
  const controlLetter = CIF_CONTROL_LETTERS[e];

  // Letras que exigen control NUMÉRICO, letra, o cualquiera de los dos.
  if ("ABEH".includes(org)) return control === controlDigit;
  if ("KPQS".includes(org)) return control === controlLetter;
  return control === controlDigit || control === controlLetter;
}

/**
 * Valida un DNI, NIE o CIF español (formato + dígito/letra de control).
 */
export function validarNIF(nif: string): NifResult {
  const v = normalizarNIF(nif);

  if (/^\d{8}[A-Z]$/.test(v)) {
    return validarDNI(v)
      ? { valido: true, tipo: "DNI" }
      : { valido: false, mensaje: "El NIF/CIF no es válido. Revísalo." };
  }

  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    return validarNIE(v)
      ? { valido: true, tipo: "NIE" }
      : { valido: false, mensaje: "El NIF/CIF no es válido. Revísalo." };
  }

  if (new RegExp(`^[${CIF_ORG_LETTERS}]\\d{7}[0-9A-J]$`).test(v)) {
    return validarCIF(v)
      ? { valido: true, tipo: "CIF" }
      : { valido: false, mensaje: "El NIF/CIF no es válido. Revísalo." };
  }

  return { valido: false, mensaje: "Formato no reconocido. Introduce un NIF, NIE o CIF válido." };
}
