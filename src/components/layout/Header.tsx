"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white sticky top-0 z-50" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-5xl mx-auto px-5 h-24 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="o²Wave" style={{ height: 80, width: "auto", display: "block" }} />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
            style={{
              color: pathname === "/" ? "var(--orange)" : "var(--gray)",
              background: pathname === "/" ? "var(--orange-light)" : "transparent",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Generar
          </Link>
          <Link
            href="/history"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
            style={{
              color: pathname === "/history" ? "var(--orange)" : "var(--gray)",
              background: pathname === "/history" ? "var(--orange-light)" : "transparent",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Historial
          </Link>
        </nav>
      </div>
    </header>
  );
}
