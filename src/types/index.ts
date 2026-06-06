export type Plan = "free" | "basico" | "pro" | "enterprise";
export type TipoEntidad =
  | "ong"
  | "pyme"
  | "autonomo"
  | "ong_pequena"
  | "ong_mediana"
  | "empresa";
export type RedSocial = "Instagram" | "Facebook" | "TikTok";
export type FormatoInstagram = "Post 1080×1080" | "Story 9:16";
export type Tono = "Motivador" | "Informativo" | "Cercano" | "Urgente";

export interface Profile {
  id: string;
  email: string;
  nombre_entidad?: string;
  tipo_entidad?: TipoEntidad;
  sector?: string;
  web_url?: string;
  plan: Plan;
  onboarding_complete: boolean;
  created_at: string;
}

export interface BrandIdentity {
  id: string;
  user_id: string;
  colores: string[];
  tipografia?: string;
  estilo?: string;
  logo_url?: string;
  web_url?: string;
  raw_analysis?: Record<string, unknown>;
}

export interface GeneratedPost {
  id: string;
  user_id: string;
  red_social: RedSocial;
  formato?: FormatoInstagram;
  texto: string;
  imagen_url?: string;
  tema: string;
  tono: string;
  tipo_entidad?: TipoEntidad;
  nombre_entidad?: string;
  guion_tiktok?: GuionTikTok | null;
  created_at: string;
}

export interface GuionSegmento {
  tiempo: string;
  voz: string;
  accion: string;
}
export interface GuionPlano {
  numero: number;
  descripcion: string;
}
export interface GuionTikTok {
  titular: string;
  guion: GuionSegmento[];
  planos: GuionPlano[];
  hashtags: string[];
  audio_sugerido: string;
  // Parámetros de generación, para poder regenerar con los mismos ajustes.
  params?: { duracion: string; tono: string; entorno: string };
}

export interface KeyDate {
  id: string;
  nombre: string;
  fecha: string;
  sector: string[];
  descripcion?: string;
  tipo: string;
}

export interface ContentFormData {
  nombreOrganizacion: string;
  tipoOrganizacion: TipoEntidad;
  redSocial: RedSocial;
  formatoInstagram?: FormatoInstagram;
  entornoTikTok?: string;
  duracionTikTok?: string;
  tonoTikTok?: string;
  tema: string;
  tono: Tono;
  incluirHashtags: boolean;
  incluirEmojis: boolean;
}
