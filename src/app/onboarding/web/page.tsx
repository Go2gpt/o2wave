"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Spinner from "@/components/ui/Spinner";

const STEPS = ["Accediendo a la web...", "Analizando colores y tipografía...", "Detectando estilo de comunicación...", "Generando identidad visual..."];

export default function OnboardingWebPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    setStep(0);

    // Simulate progressive steps
    const stepTimer = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 1200);

    try {
      const res = await fetch("/api/analyze-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      clearInterval(stepTimer);

      if (!res.ok || data.error) throw new Error(data.error || "Error al analizar");

      // Store analysis in sessionStorage to pass to next step
      sessionStorage.setItem("brand_analysis", JSON.stringify(data.analysis));
      sessionStorage.setItem("web_url", url);
      router.push("/onboarding/identity");
    } catch (err: unknown) {
      clearInterval(stepTimer);
      setError(err instanceof Error ? err.message : "Error al analizar la web");
      setLoading(false);
    }
  };

  const skipOnboarding = () => router.push("/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <Logo size="md" />
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1">
            {[0, 1].map(i => (
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
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                ¿Tienes página web?
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                La analizamos con IA para extraer tu identidad visual y adaptar el contenido a tu estilo.
              </p>
            </div>

            {/* Visual */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-32 rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)" }}>
                <div className="absolute top-3 left-3 right-3 h-2 bg-gray-300 rounded-full" />
                <div className="absolute top-8 left-3 right-8 h-1.5 bg-gray-200 rounded-full" />
                <div className="absolute top-12 left-3 right-5 h-1.5 bg-gray-200 rounded-full" />
                <div className="absolute bottom-4 left-3 flex gap-1.5">
                  {["#93bf30", "#f9b23b", "#6366f1"].map(c => (
                    <div key={c} className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="absolute top-1.5 right-3 flex gap-1">
                  {["#e5e7eb", "#e5e7eb", "#e5e7eb"].map((c, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  URL de tu web
                </label>
                <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="www.tuorganizacion.org" required
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                  onFocus={e => e.target.style.borderColor = "#f9b23b"}
                  onBlur={e => e.target.style.borderColor = "#f3f4f6"} />
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

            <button onClick={skipOnboarding}
              className="w-full mt-3 py-3 text-sm text-gray-400 font-medium">
              Saltar por ahora →
            </button>
          </>
        ) : (
          /* Loading state */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: "#f9b23b", borderTopColor: "transparent" }} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">IA analizando tu web...</h2>
            <p className="text-sm font-medium mb-6" style={{ color: "#f9b23b" }}>{STEPS[step]}</p>

            <div className="w-48 flex flex-col gap-2">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: i <= step ? "#f9b23b" : "#e5e7eb" }}>
                    {i < step && <span className="text-white text-[8px]">✓</span>}
                    {i === step && <Spinner size={3} />}
                  </div>
                  <p className="text-xs text-left" style={{ color: i <= step ? "#374151" : "#9ca3af" }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
