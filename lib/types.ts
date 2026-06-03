export type RedSocial = "Instagram" | "Facebook" | "TikTok";
export type FormatoInstagram = "Post 1080×1080" | "Story 9:16";
export type TipoOrganizacion = "ONG" | "Empresa";
export type Tono = "Profesional" | "Cercano" | "Inspirador" | "Urgente";

export interface FormData {
  nombreOrganizacion: string;
  tipoOrganizacion: TipoOrganizacion;
  redSocial: RedSocial;
  formatoInstagram?: FormatoInstagram;
  entornoTikTok?: string;
  tema: string;
  tono: Tono;
  incluirHashtags: boolean;
  incluirEmojis: boolean;
}

export interface GeneratedContent {
  id: string;
  texto: string;
  imagenUrl?: string;
  formData: FormData;
  fechaCreacion: string;
  esTikTok?: boolean;
}
