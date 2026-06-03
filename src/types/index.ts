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
