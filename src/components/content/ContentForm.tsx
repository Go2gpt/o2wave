"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ContentRequest, GeneratedContent, Platform, ContentTone, OrgType } from "@/types";

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
];

const toneOptions = [
  { value: "professional", label: "Profesional" },
  { value: "casual", label: "Casual y cercano" },
  { value: "inspirational", label: "Inspirador" },
  { value: "educational", label: "Educativo" },
  { value: "urgente", label: "Urgente / llamada a la acción" },
];

const orgTypeOptions = [
  { value: "ong", label: "ONG" },
  { value: "pyme", label: "PYME" },
];

interface ContentFormProps {
  onGenerated: (content: GeneratedContent) => void;
}

export function ContentForm({ onGenerated }: ContentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContentRequest>({
    platform: "instagram",
    tone: "professional",
    orgType: "ong",
    topic: "",
    orgName: "",
    includeHashtags: true,
    includeEmoji: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al generar contenido");
        return;
      }

      onGenerated({ ...data, createdAt: new Date(data.createdAt) });
    } catch {
      setError("Error de conexión. Verifica tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Nombre de tu organización"
        placeholder="Ej: Fundación Verde, Cafetería La Esquina..."
        value={form.orgName}
        onChange={(e) => setForm({ ...form, orgName: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo de organización"
          options={orgTypeOptions}
          value={form.orgType}
          onChange={(e) => setForm({ ...form, orgType: e.target.value as OrgType })}
        />
        <Select
          label="Red social"
          options={platformOptions}
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
        />
      </div>

      <Textarea
        label="¿Sobre qué quieres publicar?"
        placeholder="Ej: Campaña de donación de ropa de invierno para familias vulnerables..."
        value={form.topic}
        onChange={(e) => setForm({ ...form, topic: e.target.value })}
        rows={3}
        required
      />

      <Select
        label="Tono del mensaje"
        options={toneOptions}
        value={form.tone}
        onChange={(e) => setForm({ ...form, tone: e.target.value as ContentTone })}
      />

      {/* Checkboxes */}
      <div
        className="flex gap-5 p-3 rounded-xl"
        style={{ background: "var(--gray-light)" }}
      >
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none" style={{ color: "var(--black)" }}>
          <input
            type="checkbox"
            checked={form.includeHashtags}
            onChange={(e) => setForm({ ...form, includeHashtags: e.target.checked })}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--orange)" }}
          />
          Incluir hashtags
        </label>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none" style={{ color: "var(--black)" }}>
          <input
            type="checkbox"
            checked={form.includeEmoji}
            onChange={(e) => setForm({ ...form, includeEmoji: e.target.checked })}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--orange)" }}
          />
          Incluir emojis
        </label>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA" }}
        >
          {error}
        </div>
      )}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? "Generando contenido..." : "Generar con IA →"}
      </Button>
    </form>
  );
}
