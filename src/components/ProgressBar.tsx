/** Barra de progreso por pasos. actual es 1-indexado (1..pasos). */
export default function ProgressBar({ pasos, actual, etiqueta }: {
  pasos: number;
  actual: number;
  etiqueta?: string;
}) {
  const pct = Math.round((Math.min(actual, pasos) / pasos) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#f9b23b" }} />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {etiqueta ?? `Paso ${actual} de ${pasos}`}
      </span>
    </div>
  );
}
