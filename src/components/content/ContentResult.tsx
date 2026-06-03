"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PLATFORM_LABELS } from "@/lib/utils";
import type { GeneratedContent } from "@/types";

interface ContentResultProps {
  content: GeneratedContent;
  onReset: () => void;
}

export function ContentResult({ content, onReset }: ContentResultProps) {
  const [copied, setCopied] = useState(false);

  const fullText = content.hashtags.length
    ? `${content.content}\n\n${content.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`
    : content.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--orange-light)", color: "var(--orange)" }}
          >
            {PLATFORM_LABELS[content.platform]}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--gray)" }}>
            {content.orgName}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--gray)" }}>
          {content.content.length} caracteres
        </span>
      </div>

      {/* Content box */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--gray-light)", border: "1.5px solid var(--border)" }}
      >
        <p
          className="text-sm whitespace-pre-wrap leading-relaxed"
          style={{ color: "var(--black)" }}
        >
          {content.content}
        </p>
        {content.hashtags.length > 0 && (
          <p
            className="mt-3 text-sm font-semibold"
            style={{ color: "var(--orange)" }}
          >
            {content.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleCopy} variant="primary" className="flex-1">
          {copied ? "¡Copiado! ✓" : "Copiar texto"}
        </Button>
        <Button onClick={onReset} variant="ghost" className="flex-1">
          Generar otro
        </Button>
      </div>
    </div>
  );
}
