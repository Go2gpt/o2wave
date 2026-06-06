import Link from "next/link";

interface BackLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 -ml-2 px-2 py-2 text-sm font-medium text-white/50 hover:text-white transition-colors"
    >
      <span aria-hidden className="text-base leading-none">←</span>
      {children}
    </Link>
  );
}
