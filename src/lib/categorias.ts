export const CATEGORIAS = [
  "salud",
  "causas_sociales",
  "medioambiente",
  "mujer_igualdad",
  "infancia_juventud",
  "diversidad_lgbtiq",
  "mayores_discapacidad",
  "educacion_cultura",
  "derechos_humanos",
  "fiestas_tradiciones",
  // Empresariales + transversales (PYME)
  "fechas_comerciales",
  "cliente_atencion",
  "ventas_marketing",
  "innovacion_tecnologia",
  "rrhh_equipo",
  "sostenibilidad_empresa",
  "educacion_formacion",
  "industria_emprendimiento",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<string, string> = {
  salud: "Salud",
  causas_sociales: "Causas sociales y exclusión",
  medioambiente: "Medioambiente",
  mujer_igualdad: "Mujer e igualdad",
  infancia_juventud: "Infancia y juventud",
  diversidad_lgbtiq: "Diversidad LGBTIQ+",
  mayores_discapacidad: "Mayores y discapacidad",
  educacion_cultura: "Educación y cultura",
  derechos_humanos: "Derechos humanos y paz",
  fiestas_tradiciones: "Fiestas y tradiciones",
  fechas_comerciales: "Fechas comerciales",
  cliente_atencion: "Cliente y atención",
  ventas_marketing: "Ventas y marketing",
  innovacion_tecnologia: "Innovación y tecnología",
  rrhh_equipo: "RRHH y equipo",
  sostenibilidad_empresa: "Sostenibilidad empresarial",
  educacion_formacion: "Educación y formación",
  industria_emprendimiento: "Industria y emprendimiento",
};

/** A quién aplica cada categoría: 'ong', 'empresa' o 'transversal' (ambos). */
export const CATEGORIA_APLICABLE_A: Record<string, "ong" | "empresa" | "transversal"> = {
  salud: "ong",
  causas_sociales: "ong",
  medioambiente: "ong",
  mujer_igualdad: "ong",
  infancia_juventud: "ong",
  diversidad_lgbtiq: "ong",
  mayores_discapacidad: "ong",
  educacion_cultura: "ong",
  derechos_humanos: "ong",
  fiestas_tradiciones: "ong",
  fechas_comerciales: "empresa",
  cliente_atencion: "empresa",
  ventas_marketing: "empresa",
  innovacion_tecnologia: "transversal",
  rrhh_equipo: "transversal",
  sostenibilidad_empresa: "transversal",
  educacion_formacion: "transversal",
  industria_emprendimiento: "empresa",
};

/** Categorías ofrecidas a un tipo de entidad: las suyas + las transversales.
 *  Tipo desconocido/admin (null) → todas. */
export function categoriasParaTipo(tipoEntidad: string | null | undefined): string[] {
  const grupo = tipoEntidad === "empresa" ? "empresa" : (tipoEntidad?.startsWith("ong") ? "ong" : null);
  if (!grupo) return [...CATEGORIAS];
  return CATEGORIAS.filter((c) => {
    const a = CATEGORIA_APLICABLE_A[c];
    return a === "transversal" || a === grupo;
  });
}

export const CATEGORIA_COLOR: Record<string, { bg: string; color: string }> = {
  salud: { bg: "#fee2e2", color: "#b91c1c" },
  causas_sociales: { bg: "#dbeafe", color: "#1e40af" },
  medioambiente: { bg: "#dcfce7", color: "#166534" },
  mujer_igualdad: { bg: "#f3e8ff", color: "#7e22ce" },
  infancia_juventud: { bg: "#fef9c3", color: "#a16207" },
  diversidad_lgbtiq: { bg: "#ffe4e6", color: "#be185d" },
  mayores_discapacidad: { bg: "#f3f4f6", color: "#4b5563" },
  educacion_cultura: { bg: "#e0e7ff", color: "#3730a3" },
  derechos_humanos: { bg: "#d1fae5", color: "#065f46" },
  fiestas_tradiciones: { bg: "#ede9fe", color: "#6d28d9" },
  fechas_comerciales: { bg: "#ffedd5", color: "#c2410c" },
  cliente_atencion: { bg: "#cffafe", color: "#0e7490" },
  ventas_marketing: { bg: "#fce7f3", color: "#be185d" },
  innovacion_tecnologia: { bg: "#e0e7ff", color: "#4338ca" },
  rrhh_equipo: { bg: "#fef3c7", color: "#b45309" },
  sostenibilidad_empresa: { bg: "#dcfce7", color: "#15803d" },
  educacion_formacion: { bg: "#dbeafe", color: "#1d4ed8" },
  industria_emprendimiento: { bg: "#f3f4f6", color: "#374151" },
};

export interface DiaClave {
  id: string;
  mes: number;
  dia: number;
  nombre: string;
  categoria: string;
  ambito: string;
  relevancia: string;
  descripcion: string | null;
  // Fechas personalizadas del usuario (tabla fechas_usuario):
  recurrente?: boolean;            // undefined/true → se repite cada año; false → puntual
  ano_especifico?: number | null;  // año para fechas puntuales
  esFechaUsuario?: boolean;         // marca para renderizar el badge "Mi fecha"
}

export interface DiaProximo extends DiaClave {
  fechaISO: string;
  diffDays: number;
}

/**
 * Para cada día (mes, dia) calcula su próxima ocurrencia desde hoy y los días
 * que faltan, y ordena por fecha. Los días clave normales se tratan como
 * recurrentes (este año, o el siguiente si ya pasaron). Las fechas puntuales
 * (recurrente === false) usan ano_especifico y se omiten si ya pasaron.
 */
export function calcularProximos(dias: DiaClave[], hoy: Date = new Date()): DiaProximo[] {
  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const out: DiaProximo[] = [];
  for (const d of dias) {
    let fecha: Date;
    if (d.recurrente === false) {
      const year = d.ano_especifico ?? hoyMid.getFullYear();
      fecha = new Date(year, d.mes - 1, d.dia);
      if (fecha.getTime() < hoyMid.getTime()) continue; // puntual ya pasada → fuera
    } else {
      const y = hoyMid.getFullYear();
      fecha = new Date(y, d.mes - 1, d.dia);
      if (fecha.getTime() < hoyMid.getTime()) fecha = new Date(y + 1, d.mes - 1, d.dia);
    }
    const diffDays = Math.round((fecha.getTime() - hoyMid.getTime()) / 86400000);
    out.push({ ...d, fechaISO: fecha.toISOString(), diffDays });
  }
  return out.sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
}
