import NavBottom from "@/components/NavBottom";
import IdleLogout from "@/components/IdleLogout";
import InstallPrompt from "@/components/InstallPrompt";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", paddingBottom: "5rem" }}>
      <IdleLogout />
      <InstallPrompt />
      {children}
      <NavBottom />
    </div>
  );
}
