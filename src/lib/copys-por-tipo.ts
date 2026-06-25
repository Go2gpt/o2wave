/**
 * Copys y UX ramificados por tipo de cuenta. El perfil guarda `tipo_entidad`
 * con valores finos (ong_pequena/ong_mediana/empresa/particular y legacy
 * ong/pyme/autonomo); aquí los normalizamos a 3 grupos de copy y centralizamos
 * los textos que cambian entre ONG, empresa y particular.
 */

export type GrupoCuenta = "ong" | "empresa" | "particular";

/** Normaliza `tipo_entidad` a uno de los 3 grupos de copy. Fallback: empresa. */
export function grupoCuenta(tipoEntidad?: string | null): GrupoCuenta {
  const t = (tipoEntidad || "").toLowerCase();
  if (t.startsWith("ong")) return "ong";
  if (t === "particular") return "particular";
  return "empresa";
}

type PorGrupo = Record<GrupoCuenta, string>;

/** Textos del onboarding "sin web" (frase + voz + identidad). */
export const COPY_SIN_WEB: Record<string, PorGrupo> = {
  paso1Sub: {
    ong: "Dedica 1 minuto y la IA aprenderá a comunicar como tu organización, no como una IA genérica.",
    empresa: "Dedica 1 minuto y la IA aprenderá a comunicar como tu empresa, no como una IA genérica.",
    particular: "Dedica 1 minuto y la IA aprenderá a comunicar como tú, no como una IA genérica.",
  },
  paso1Label: {
    ong: "En una frase, ¿a qué se dedica tu organización?",
    empresa: "En una frase, ¿a qué se dedica tu empresa?",
    particular: "En una frase, ¿a qué te dedicas?",
  },
  paso1Placeholder: {
    ong: "Ej: ayudamos a personas en exclusión social en Barcelona",
    empresa: "Ej: agencia de viajes especializada en escapadas rurales en España.",
    particular: "Ej: soy creator de contenido sobre tecnología y emprendimiento",
  },
  paso3Label: {
    ong: "Pega tu bio o descripción de la organización",
    empresa: "Pega tu bio o descripción de la empresa",
    particular: "Pega tu bio o descripción de ti como profesional",
  },
  paso3Sub: {
    ong: "La que tienes en Instagram, Facebook o LinkedIn. O cualquier descripción corta que uses.",
    empresa: "La que tienes en LinkedIn, Instagram, Facebook o tu firma de email.",
    particular: "La que tienes en LinkedIn, Instagram o tu firma de email. O cualquier descripción corta que uses sobre ti.",
  },
  paso4Actividad: {
    ong: "🎯 Tu propósito",
    empresa: "🎯 Tu actividad",
    particular: "🎯 A qué te dedicas",
  },
};

/** Textos del onboarding "identity" (revisión/edición del perfil). */
export const COPY_IDENTITY: Record<string, PorGrupo> = {
  h1NoSuficiente: {
    ong: "Cuéntanos sobre tu organización",
    empresa: "Cuéntanos sobre tu empresa",
    particular: "Cuéntanos sobre ti",
  },
  nombreLabel: {
    ong: "Nombre de la entidad",
    empresa: "Nombre de la empresa",
    particular: "Tu nombre completo o nombre artístico",
  },
};

/** Textos de /create. */
export const COPY_CREATE: Record<string, PorGrupo> = {
  nombreLabel: {
    ong: "Nombre de tu organización",
    empresa: "Nombre de tu empresa",
    particular: "Tu nombre o marca personal",
  },
  nombrePlaceholder: {
    ong: "Ej: Fundación Futuro Verde",
    empresa: "Ej: Zapatos Rodríguez",
    particular: "Ej: Sebastián Ferragut",
  },
};

/** Aviso de "sin suscripción" en /plans, según el tipo de cuenta. */
export const COPY_SIN_SUB: PorGrupo = {
  ong: "Tu cuenta necesita una suscripción activa para acceder al servicio.",
  empresa: "Las empresas necesitan una suscripción activa para acceder al servicio.",
  particular: "Tu cuenta necesita una suscripción activa para acceder al servicio.",
};

/* ------------------------------- Ficha /perfil ------------------------------ */

/**
 * Etiquetas de cada campo/bloque de /perfil por grupo. La ficha de un
 * particular habla de "ti y tu contenido", no de marca corporativa.
 */
export const PERFIL_LABELS: Record<string, PorGrupo> = {
  // Bloques (títulos de sección)
  bloqueMarca: { ong: "Datos de la marca", empresa: "Datos de la marca", particular: "Sobre ti y tu contenido" },
  // Campos
  mision:       { ong: "Misión y valores", empresa: "Misión y valores", particular: "Tu propósito" },
  publico:      { ong: "Público objetivo", empresa: "Público objetivo", particular: "A quién te diriges" },
  servicios:    { ong: "Servicios o programas", empresa: "Servicios", particular: "Servicios o programas" },
  causas:       { ong: "Causas", empresa: "Productos", particular: "Causas o productos" },
  temas:        { ong: "Temas prioritarios", empresa: "Temas prioritarios", particular: "Temas que te interesan" },
  tipoPubli:    { ong: "Tipo de publicaciones", empresa: "Tipo de publicaciones", particular: "Tipo de posts que quieres crear" },
  estiloVisual: { ong: "Estilo visual de marca", empresa: "Estilo visual de marca", particular: "Estilo visual de tus posts" },
  geografia:    { ong: "Geografía / ámbito", empresa: "Geografía / ámbito", particular: "Desde dónde publicas" },
  logros:       { ong: "Logros y números", empresa: "Logros y números", particular: "Logros y números" },
  colores:      { ong: "Colores de marca (1-5)", empresa: "Colores de marca (1-5)", particular: "Tu paleta de color (1-5)" },
  documento:    { ong: "CIF", empresa: "CIF / NIF", particular: "Documento (DNI / NIE / Pasaporte)" },
};

/** Campos del perfil que NO se muestran (ni se envían al prompt) a un particular. */
const PERFIL_OCULTOS_PARTICULAR = new Set(["servicios", "causas", "logros"]);

/** ¿Se muestra este campo de /perfil para el grupo dado? */
export function mostrarCampoEnPerfil(campo: string, grupo: GrupoCuenta): boolean {
  if (grupo === "particular" && PERFIL_OCULTOS_PARTICULAR.has(campo)) return false;
  return true;
}

/** Etiqueta de un campo de /perfil para el grupo dado. */
export function labelCampoPerfil(campo: string, grupo: GrupoCuenta): string {
  return PERFIL_LABELS[campo]?.[grupo] ?? campo;
}

/** Título de un bloque de /perfil para el grupo dado. */
export function tituloBloquePerfil(bloque: string, grupo: GrupoCuenta): string {
  return PERFIL_LABELS[bloque]?.[grupo] ?? bloque;
}
