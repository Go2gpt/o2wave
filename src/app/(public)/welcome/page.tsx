import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F0F0F" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #93bf30 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f9b23b 0%, transparent 70%)" }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <img src="/logo.png" alt="o²Wave" height={280} style={{ height: 280, width: "auto" }} className="mb-8" />

        {/* Headline */}
        <h1 className="text-2xl font-bold text-white leading-snug mb-3 max-w-xs">
          Tú pones un rato al día.
          <br />
          <span style={{ color: "#f9b23b" }}>Nosotros el resto.</span>
        </h1>

        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-10">
          Genera contenido para redes sociales con IA.
          Diseñado para ONGs y PYMEs que quieren comunicar mejor, sin perder tiempo.
        </p>

        {/* Claude badge */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-10"
          style={{ backgroundColor: "rgba(147,191,48,0.15)", color: "#93bf30", border: "1px solid rgba(147,191,48,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#93bf30" }} />
          Potenciado por Claude AI
        </div>

        {/* CTA buttons */}
        <div className="w-full max-w-xs space-y-3">
          <Link href="/register"
            className="block w-full py-4 rounded-2xl text-center font-bold text-base text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f9b23b" }}>
            Empezar gratis
          </Link>
          <Link href="/login"
            className="block w-full py-4 rounded-2xl text-center font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
            Ya tengo cuenta
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative text-center text-xs text-gray-600 py-4">
        © 2026 Generación o2
      </p>
    </div>
  );
}
