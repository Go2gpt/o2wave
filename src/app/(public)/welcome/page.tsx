import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Logo */}
        <img src="/logo.png" alt="o²Wave" height={80} style={{ height: 80, width: "auto" }} className="mb-10" />

        {/* Tagline */}
        <h1 className="text-2xl font-bold text-gray-800 leading-snug mb-10 max-w-sm">
          Tú pones un rato al día. Nosotros, el contenido que hace crecer tu comunidad.
        </h1>

        {/* CTAs */}
        <div className="w-full max-w-xs space-y-3">
          <Link href="/register"
            className="block w-full py-4 rounded-full text-center font-bold text-base text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#f9b23b" }}>
            Empezar gratis
          </Link>
          <Link href="/login"
            className="block w-full py-4 rounded-full text-center font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#fff", color: "#6b7280", border: "2px solid #e5e7eb" }}>
            Ya tengo cuenta
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 py-6">
        Un producto de Generación o2
      </p>
    </div>
  );
}
