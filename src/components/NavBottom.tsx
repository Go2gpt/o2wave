"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", icon: "🏠", label: "Inicio" },
  { href: "/create",    icon: "✨", label: "Crear" },
  { href: "/dias",      icon: "📅", label: "Días" },
  { href: "/stats",     icon: "📊", label: "Stats" },
  { href: "/perfil",    icon: "👤", label: "Perfil" },
];

export default function NavBottom() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
              style={{ color: active ? "#f9b23b" : "#9ca3af" }}>
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
