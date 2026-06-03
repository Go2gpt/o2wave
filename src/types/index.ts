// Legacy types (kept for src/app/api/generate compatibility)
export type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok";
export type ContentTone = "professional" | "casual" | "inspirational" | "educational" | "urgente";
export type OrgType = "ong" | "pyme";

export interface ContentRequest {
  platform: Platform;
  tone: ContentTone;
  orgType: OrgType;
  topic: string;
  orgName: string;
  includeHashtags: boolean;
  includeEmoji: boolean;
  wordLimit?: number;
}

export interface GeneratedContent {
  id: string;
  platform: Platform;
  tone: ContentTone;
  orgType: OrgType;
  topic: string;
  orgName: string;
  content: string;
  hashtags: string[];
  createdAt: Date;
}

// ── New app types ──────────────────────────────────────
export type Plan = "free" | "basico" | "pro" | "enterprise";
export type TipoEntidad = "ong" | "pyme" | "autonomo";
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
  tono: Tono;
  tipo_entidad?: TipoEntidad;
  nombre_entidad?: string;
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
  tema: string;
  tono: Tono;
  incluirHashtags: boolean;
  incluirEmojis: boolean;
}
