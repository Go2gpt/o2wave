import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <h1 className="text-6xl font-bold mb-4" style={{ color: "#0F0F0F" }}>404</h1>
        <p className="text-xl text-gray-800 mb-2">Esta página no existe.</p>
        <p className="text-gray-500 mb-8">Quizá te equivocaste de URL o el enlace ya no está activo.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="px-6 py-3 rounded-full font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "#f9b23b" }}>
            Ir al inicio
          </Link>
          <Link href="/create" className="px-6 py-3 rounded-full font-bold border-2 transition-all active:scale-95" style={{ borderColor: "#93bf30", color: "#93bf30" }}>
            Crear contenido
          </Link>
        </div>
      </div>
    </div>
  );
}
