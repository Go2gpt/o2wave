export const CATEGORIAS = [
  "salud",
  "social",
  "medioambiente",
  "mujer_igualdad",
  "infancia_juventud",
  "diversidad",
  "mayores_discapacidad",
  "educacion_cultura",
  "solidaridad_dh",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<string, string> = {
  salud: "Salud",
  social: "Social",
  medioambiente: "Medioambiente",
  mujer_igualdad: "Mujer e Igualdad",
  infancia_juventud: "Infancia y Juventud",
  diversidad: "Diversidad",
  mayores_discapacidad: "Mayores y Discapacidad",
  educacion_cultura: "Educación y Cultura",
  solidaridad_dh: "Solidaridad y Derechos Humanos",
};

export const CATEGORIA_COLOR: Record<string, { bg: string; color: string }> = {
  salud: { bg: "#fee2e2", color: "#b91c1c" },
  social: { bg: "#dbeafe", color: "#1e40af" },
  medioambiente: { bg: "#dcfce7", color: "#166534" },
  mujer_igualdad: { bg: "#f3e8ff", color: "#7e22ce" },
  infancia_juventud: { bg: "#fef9c3", color: "#a16207" },
  diversidad: { bg: "#ffe4e6", color: "#be185d" },
  mayores_discapacidad: { bg: "#f3f4f6", color: "#4b5563" },
  educacion_cultura: { bg: "#e0e7ff", color: "#3730a3" },
  solidaridad_dh: { bg: "#d1fae5", color: "#065f46" },
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
}

export interface DiaProximo extends DiaClave {
  fechaISO: string;
  diffDays: number;
}

/**
 * Para cada día (mes, dia) calcula su próxima ocurrencia desde hoy (este año, o
 * el siguiente si ya pasó), con los días que faltan. Ordena por fecha.
 */
export function calcularProximos(dias: DiaClave[], hoy: Date = new Date()): DiaProximo[] {
  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return dias
    .map((d) => {
      const y = hoyMid.getFullYear();
      let fecha = new Date(y, d.mes - 1, d.dia);
      if (fecha.getTime() < hoyMid.getTime()) fecha = new Date(y + 1, d.mes - 1, d.dia);
      const diffDays = Math.round((fecha.getTime() - hoyMid.getTime()) / 86400000);
      return { ...d, fechaISO: fecha.toISOString(), diffDays };
    })
    .sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
}
