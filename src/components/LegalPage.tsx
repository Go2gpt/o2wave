import BackLink from "@/components/BackLink";

const ULTIMA_ACTUALIZACION = "6 de junio de 2026";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* Origen variable (perfil, registro, footer…) → volvemos a la pantalla anterior. */}
        <BackLink>Volver</BackLink>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">{title}</h1>
        <div className="text-gray-700 text-[15px] leading-relaxed space-y-4
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-1
          [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mt-4
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
          [&_a]:font-semibold [&_a]:text-[#93bf30] [&_a]:underline
          [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-2
          [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_th]:bg-gray-50 [&_th]:text-left
          [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_td]:align-top">
          {children}
        </div>
        <p className="text-xs text-gray-400 mt-10 pt-6 border-t border-gray-100">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>
      </div>
    </div>
  );
}
