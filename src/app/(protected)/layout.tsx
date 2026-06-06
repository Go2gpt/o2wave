import NavBottom from "@/components/NavBottom";
import IdleLogout from "@/components/IdleLogout";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", paddingBottom: "5rem" }}>
      <IdleLogout />
      {children}
      <NavBottom />
    </div>
  );
}
