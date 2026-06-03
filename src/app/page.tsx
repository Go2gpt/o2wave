"use client";

import { useState } from "react";
import { ContentForm } from "@/components/content/ContentForm";
import { ContentResult } from "@/components/content/ContentResult";
import { useHistory } from "@/hooks/useHistory";
import type { GeneratedContent } from "@/types";

export default function HomePage() {
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const { addToHistory } = useHistory();

  const handleGenerated = (content: GeneratedContent) => {
    setResult(content);
    addToHistory(content);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
          style={{ background: "var(--green-light)", color: "var(--green-dark)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--green)" }} />
          Potenciado por Claude AI
        </div>
        <h1
          className="text-4xl font-extrabold mb-3 leading-tight"
          style={{ color: "var(--black)" }}
        >
          Genera contenido para<br />
          <span style={{ color: "var(--orange)" }}>redes sociales</span> en segundos
        </h1>
        <p className="text-base" style={{ color: "var(--gray)" }}>
          Diseñado para ONGs y PYMEs que quieren comunicar mejor, sin perder tiempo.
        </p>
      </div>

      {/* Card */}
      <div
        className="bg-white rounded-3xl p-7 shadow-sm"
        style={{ border: "1.5px solid var(--border)" }}
      >
        {result ? (
          <ContentResult content={result} onReset={() => setResult(null)} />
        ) : (
          <ContentForm onGenerated={handleGenerated} />
        )}
      </div>
    </main>
  );
}
