"use client";

import { useEffect, useState } from "react";

/** Aviso verde tras eliminar la cuenta (welcome?cuenta_eliminada=1). Se cierra solo a los 5s o con la X. */
export default function CuentaEliminadaBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg"
        style={{ backgroundColor: "#f0f7e6", border: "1px solid #d4e8b4" }}>
        <span className="text-lg flex-shrink-0">✓</span>
        <p className="flex-1 text-sm font-medium" style={{ color: "#3f6212" }}>
          Cuenta eliminada correctamente. Esperamos verte de nuevo pronto.
        </p>
        <button onClick={() => setVisible(false)} aria-label="Cerrar" className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>
    </div>
  );
}
