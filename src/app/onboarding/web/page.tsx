"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function OnboardingWebPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goToResults = (payload: { suficiente: boolean; analysis?: unknown }, webUrl: string) => {
    sessionStorage.setItem("onb_data", JSON.stringify(payload));
    sessionStorage.setItem("web_url", webUrl);
    router.push("/onboarding/identity");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al analizar");
      goToResults({ suficiente: !!data.suficiente, analysis: data.analysis }, url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al analizar la web");
      setLoading(false);
    }
  };

  const irSinWeb = () => router.push("/onboarding/sin-web");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <Logo size="md" />
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === 0 ? "24px" : "8px", backgroundColor: i === 0 ? "#f9b23b" : "#e5e7eb" }} />
            ))}
          </div>
          <span className="text-xs text-gray-400">1 de 2</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8">
        {!loading ? (
          <>
            <div className="mb-8">
              <h1 className="text-xl font-bold text-gray-900 mb-2">¿Tienes página web?</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                La analizamos con IA para extraer tu identidad, valores, servicios y mucho más, y personalizar tu experiencia.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  URL de tu web
                </label>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="www.tuorganizacion.org" required
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                  onFocus={(e) => (e.target.style.borderColor = "#f9b23b")}
                  onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
              </div>

              {error && (
                <div className="rounded-xl p-3 bg-red-50 border border-red-100">
                  <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
                </div>
              )}

              <button type="submit"
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#f9b23b" }}>
                Analizar con IA ✨
              </button>
            </form>

            <button onClick={irSinWeb} className="w-full mt-3 py-3 text-sm text-gray-400 font-medium">
              No tengo web →
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: "#f9b23b", borderTopColor: "transparent" }} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Analizando tu web...</h2>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Esto puede tardar 15-30 segundos. Estamos extrayendo identidad, valores, servicios y mucho más para personalizar tu experiencia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
