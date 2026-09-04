/**
 * Validación de documentos identificativos españoles: NIF (persona física),
 * NIE (extranjero) y CIF (entidad jurídica). Valida formato + dígito/letra de
 * control. Es una comprobación estructural (no consulta ningún registro): sirve
 * para filtrar errores de tecleo al alta antes de la revisión manual.
 *
 * Uso principal: verificación de ONGs para el plan Pro Nonprofit (1,99€).
 */

export type TipoDocumento = "nif" | "nie" | "cif";

export interface ResultadoValidacion {
  valido: boolean;
  tipo?: TipoDocumento;
  /** Documento normalizado (mayúsculas, sin espacios ni guiones). */
  normalizado: string;
  /** Motivo del fallo, si no es válido. */
  motivo?: string;
}

const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE"; // índice = numero % 23
const LETRAS_CIF = "JABCDEFGHI";              // control alfabético del CIF
const NIE_PREFIJO: Record<string, string> = { X: "0", Y: "1", Z: "2" };
// Tipos de organización cuyo control es SIEMPRE letra / SIEMPRE número.
const CIF_CONTROL_LETRA = new Set(["K", "P", "Q", "S", "N", "W", "R"]);
const CIF_CONTROL_NUMERO = new Set(["A", "B", "E", "H"]);

/** Normaliza: mayúsculas y sin espacios, puntos ni guiones. */
export function normalizarDocumento(valor: string): string {
  return (valor || "").toUpperCase().replace(/[\s.\-]/g, "");
}

function letraDni(numero: number): string {
  return LETRAS_DNI[numero % 23];
}

function validarNif(doc: string): ResultadoValidacion {
  // 8 dígitos + 1 letra de control.
  if (!/^\d{8}[A-Z]$/.test(doc)) return { valido: false, normalizado: doc, motivo: "Formato de NIF no válido (8 dígitos + letra)." };
  const numero = parseInt(doc.slice(0, 8), 10);
  const ok = doc[8] === letraDni(numero);
  return ok ? { valido: true, tipo: "nif", normalizado: doc } : { valido: false, tipo: "nif", normalizado: doc, motivo: "La letra del NIF no corresponde al número." };
}

function validarNie(doc: string): ResultadoValidacion {
  // X/Y/Z + 7 dígitos + letra de control.
  if (!/^[XYZ]\d{7}[A-Z]$/.test(doc)) return { valido: false, normalizado: doc, motivo: "Formato de NIE no válido (X/Y/Z + 7 dígitos + letra)." };
  const numero = parseInt(NIE_PREFIJO[doc[0]] + doc.slice(1, 8), 10);
  const ok = doc[8] === letraDni(numero);
  return ok ? { valido: true, tipo: "nie", normalizado: doc } : { valido: false, tipo: "nie", normalizado: doc, motivo: "La letra del NIE no corresponde al número." };
}

function validarCif(doc: string): ResultadoValidacion {
  // Letra de tipo + 7 dígitos + control (dígito o letra).
  if (!/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(doc)) {
    return { valido: false, normalizado: doc, motivo: "Formato de CIF no válido (letra + 7 dígitos + control)." };
  }
  const tipoOrg = doc[0];
  const digitos = doc.slice(1, 8);
  const control = doc[8];

  let suma = 0;
  for (let i = 0; i < 7; i++) {
    const n = parseInt(digitos[i], 10);
    if (i % 2 === 0) {
      // Posiciones impares (1ª, 3ª…): duplicar y sumar dígitos.
      const doble = n * 2;
      suma += doble > 9 ? doble - 9 : doble;
    } else {
      suma += n;
    }
  }
  const digitoControl = (10 - (suma % 10)) % 10;
  const letraControl = LETRAS_CIF[digitoControl];

  let ok: boolean;
  if (CIF_CONTROL_LETRA.has(tipoOrg)) ok = control === letraControl;
  else if (CIF_CONTROL_NUMERO.has(tipoOrg)) ok = control === String(digitoControl);
  else ok = control === String(digitoControl) || control === letraControl; // C,D,F,G,J,L,M,U,V: cualquiera

  return ok ? { valido: true, tipo: "cif", normalizado: doc } : { valido: false, tipo: "cif", normalizado: doc, motivo: "El dígito/letra de control del CIF no cuadra." };
}

/**
 * Valida un NIF, NIE o CIF español (formato + control). Detecta el tipo por el
 * primer carácter. Para verificar ONGs suele bastar CIF (empieza por letra) o
 * NIF; se aceptan los tres.
 */
export function validarDocumento(valor: string): ResultadoValidacion {
  const doc = normalizarDocumento(valor);
  if (!doc) return { valido: false, normalizado: doc, motivo: "Documento vacío." };
  if (doc.length !== 9) return { valido: false, normalizado: doc, motivo: "Debe tener 9 caracteres." };

  if (/^\d/.test(doc)) return validarNif(doc);           // empieza por dígito → NIF
  if (/^[XYZ]/.test(doc)) return validarNie(doc);        // X/Y/Z → NIE
  return validarCif(doc);                                 // otra letra → CIF
}

/** Atajo booleano. */
export function esDocumentoValido(valor: string): boolean {
  return validarDocumento(valor).valido;
}
