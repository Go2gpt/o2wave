"use client";

import { useHistory } from "@/hooks/useHistory";
import { Button } from "@/components/ui/Button";
import { PLATFORM_LABELS } from "@/lib/utils";

export default function HistoryPage() {
  const { history, clearHistory } = useHistory();

  if (history.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--black)" }}>
          Historial
        </h1>
        <p style={{ color: "var(--gray)" }}>Aún no has generado ningún contenido.</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--black)" }}>
          Historial
        </h1>
        <Button variant="ghost" size="sm" onClick={clearHistory}>
          Limpiar todo
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ border: "1.5px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--orange-light)", color: "var(--orange)" }}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--black)" }}>
                  {item.orgName}
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--gray)" }}>
                {new Date(item.createdAt).toLocaleDateString("es", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p
              className="text-sm whitespace-pre-wrap line-clamp-4 leading-relaxed"
              style={{ color: "var(--black)" }}
            >
              {item.content}
            </p>
            {item.hashtags.length > 0 && (
              <p className="mt-2 text-xs font-semibold" style={{ color: "var(--orange)" }}>
                {item.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
