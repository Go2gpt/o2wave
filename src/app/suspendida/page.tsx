import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function SuspendidaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mb-6"><Logo size="md" /></div>
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Cuenta suspendida</h1>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
        Tu cuenta ha sido suspendida temporalmente. Contacta con{" "}
        <a href="mailto:o2wave.app@generacion-o2.org" className="font-semibold" style={{ color: "#f9b23b" }}>
          o2wave.app@generacion-o2.org
        </a>{" "}
        para más información.
      </p>
    </main>
  );
}
