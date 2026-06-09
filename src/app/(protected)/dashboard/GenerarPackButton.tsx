"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerarPackButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000); // 4 min
    try {
      const res = await fetch("/api/pack/generar", { method: "POST", signal: controller.signal });
      const data: { pack_id?: string; error?: string } = await res.json().catch(() => ({}));
      if (res.ok && data.pack_id) {
        router.push(`/pack?abrir=${data.pack_id}`);
        return; // mantenemos "Generando…" hasta que navegue
      }
      setError(data.error || "No se pudo generar el pack.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Esto está tardando más de lo normal, compruébalo más tarde en tu pack.");
      } else {
        setError("Error de red. Inténtalo de nuevo.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generar} disabled={loading}
        className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: "#f9b23b" }}>
        {loading ? "Generando… (puede tardar 1-2 min)" : "✨ Generar pack ahora"}
      </button>
      {error && <p className="text-[11px] text-red-500 mt-1.5 leading-snug">{error}</p>}
    </div>
  );
}
