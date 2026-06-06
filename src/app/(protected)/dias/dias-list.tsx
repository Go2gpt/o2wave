"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import { CATEGORIA_LABEL, CATEGORIA_COLOR, type DiaProximo } from "@/lib/categorias";

function etiquetaFecha(d: DiaProximo): string {
  if (d.diffDays === 0) return "HOY";
  if (d.diffDays === 1) return "MAÑANA";
  return new Date(d.fechaISO).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function Tarjeta({ d, destacada, compacta }: { d: DiaProximo; destacada?: boolean; compacta?: boolean }) {
  const col = CATEGORIA_COLOR[d.categoria] || { bg: "#f3f4f6", color: "#4b5563" };
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4" style={destacada ? { border: "2px solid #f9b23b" } : undefined}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
          {etiquetaFecha(d)}
        </span>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: col.bg, color: col.color }}>
          {CATEGORIA_LABEL[d.categoria] || d.categoria}
        </span>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
          {d.ambito === "espana" ? "🇪🇸 España" : "🌍 Internacional"}
        </span>
        {d.relevancia === "alto" && <span title="Relevancia alta">⭐</span>}
      </div>
      <p className="font-bold text-gray-900 text-sm">{d.nombre}</p>
      {!compacta && d.descripcion && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{d.descripcion}</p>
      )}
      <Link
        href={`/create?tema=${encodeURIComponent(d.nombre)}&fecha=${encodeURIComponent(d.fechaISO)}`}
        className="inline-block mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
        style={{ backgroundColor: "#f9b23b" }}
      >
        ✨ Crear contenido
      </Link>
    </div>
  );
}

export default function DiasList({ proximos, hasCats }: { proximos: DiaProximo[]; hasCats: boolean }) {
  const hoyManana = proximos.filter((d) => d.diffDays <= 1);
  const semana = proximos.filter((d) => d.diffDays >= 2 && d.diffDays <= 7);
  const resto = proximos.filter((d) => d.diffDays >= 8);

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <BackLink href="/dashboard">Inicio</BackLink>
        <Logo size="sm" />
      </div>
      <div className="px-5 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Días clave</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tus próximas oportunidades de contenido</p>
      </div>

      {!hasCats ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Aún no has elegido categorías de interés</p>
            <p className="text-xs text-gray-400 mb-4">Ve a tu perfil para personalizar tu calendario.</p>
            <Link href="/perfil" className="inline-block px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: "#f9b23b" }}>
              Ir a Mi Perfil
            </Link>
          </div>
        </div>
      ) : proximos.length === 0 ? (
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-semibold text-gray-700">No hay días clave próximos para tus categorías.</p>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {hoyManana.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Hoy y mañana</p>
              <div className="space-y-3">{hoyManana.map((d) => <Tarjeta key={d.id} d={d} destacada />)}</div>
            </section>
          )}
          {semana.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Esta semana</p>
              <div className="space-y-3">{semana.map((d) => <Tarjeta key={d.id} d={d} />)}</div>
            </section>
          )}
          {resto.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Próximas semanas</p>
              <div className="space-y-2">{resto.map((d) => <Tarjeta key={d.id} d={d} compacta />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
