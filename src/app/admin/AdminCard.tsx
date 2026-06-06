import Link from "next/link";

interface AdminCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

export default function AdminCard({ href, icon, title, description, badge }: AdminCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-white/50 mt-0.5">{description}</p>
          {badge && (
            <p className="text-sm font-bold mt-2" style={{ color: "#f9b23b" }}>{badge}</p>
          )}
        </div>
        <span className="text-white/30 text-lg flex-shrink-0">→</span>
      </div>
    </Link>
  );
}
