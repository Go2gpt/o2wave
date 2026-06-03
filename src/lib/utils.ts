import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
};

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};
