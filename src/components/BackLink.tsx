"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackLinkProps {
  /** Destino fijo (padre lógico). Si se omite, usa router.back(). */
  href?: string;
  children: React.ReactNode;
  /** Texto blanco para cabeceras sobre fondo oscuro (p. ej. /admin). */
  dark?: boolean;
}

export default function BackLink({ href, children, dark }: BackLinkProps) {
  const router = useRouter();
  const cls = `inline-flex items-center gap-2 -ml-2 px-2 py-2 text-sm font-medium transition-colors ${
    dark ? "text-white/50 hover:text-white" : "text-gray-500 hover:text-gray-800"
  }`;
  const inner = (
    <>
      <span aria-hidden className="text-base leading-none">←</span>
      {children}
    </>
  );

  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={() => router.back()} className={cls}>{inner}</button>;
}
