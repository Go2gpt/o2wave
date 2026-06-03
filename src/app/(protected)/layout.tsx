import NavBottom from "@/components/NavBottom";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", paddingBottom: "5rem" }}>
      {children}
      <NavBottom />
    </div>
  );
}
