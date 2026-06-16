export type Plan = "free" | "basico" | "pro" | "enterprise";
export type TipoEntidad =
  | "ong"
  | "pyme"
  | "autonomo"
  | "ong_pequena"
  | "ong_mediana"
  | "empresa";
export type RedSocial = "Instagram" | "Facebook" | "TikTok" | "WhatsApp";
export type FormatoInstagram = "Post 1080×1080" | "Story 9:16";
export type Tono = "Motivador" | "Informativo" | "Cercano" | "Urgente";

// --- Suscripciones (Stripe) ---
export type PlanActual = "ong_pequena" | "ong_mediana" | "earlybird" | "standard" | "pro";
export type PlanCiclo = "mensual" | "anual";
export type PlanEstado = "activa" | "cancelada" | "suspendida" | "trial";

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
  // Stripe / suscripción
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan_actual?: PlanActual | null;
  plan_ciclo?: PlanCiclo | null;
  plan_estado?: PlanEstado | null;
  plan_periodo_fin?: string | null;
  posts_gratis_usados?: number | null;
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
  foto_integrada?: boolean | null; // imagen generada integrando una foto del usuario (Pro)
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

export interface FechaUsuario {
  id: string;
  user_id: string;
  mes: number;
  dia: number;
  nombre: string;
  descripcion: string | null;
  recurrente: boolean;
  ano_especifico: number | null;
  created_at: string;
}

export type PackFuente = "dia_clave" | "fecha_usuario" | "ia_sugerencia";

export interface PackDia {
  fecha: string;
  nombre_dia: string;
  tipo: string;            // "instagram" | "facebook" | "tiktok"
  tema: string;
  imagen_url?: string | null;
  imagen_limpia_url?: string | null; // imagen sin titular horneado (para recomponer)
  titular?: string;
  texto: string;
  hashtags?: string[];
  prompt_imagen?: string | null;
  guion_tiktok?: GuionTikTok | null;
  fuente: PackFuente;
}

export interface PackContenido {
  dias: PackDia[];
}

export interface PackSemanal {
  id: string;
  user_id: string;
  fecha_inicio: string;
  pdf_url: string | null;
  contenido: PackContenido;
  email_enviado: boolean;
  created_at: string;
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
