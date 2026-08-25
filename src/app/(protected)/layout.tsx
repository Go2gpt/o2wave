import NavBottom from "@/components/NavBottom";
import OnboardingTour from "@/components/OnboardingTour";
import IdleLogout from "@/components/IdleLogout";
import InstallPrompt from "@/components/InstallPrompt";
import PagoFallidoBanner from "@/components/PagoFallidoBanner";
import { createClient } from "@/lib/supabase-server";

const ESTADOS_IMPAGO = ["suspendida", "past_due", "unpaid"];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Banner global de impago: solo usuarios con suscripción Stripe (customer válido)
  // y estado de impago. Admins nunca lo ven (el portal los rechaza igualmente).
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let mostrarBanner = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("plan_estado, es_admin, stripe_customer_id").eq("id", user.id).single();
    mostrarBanner =
      !profile?.es_admin &&
      profile?.stripe_customer_id != null &&
      ESTADOS_IMPAGO.includes(profile?.plan_estado ?? "");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", paddingBottom: "5rem" }}>
      <IdleLogout />
      <InstallPrompt />
      {mostrarBanner && <PagoFallidoBanner />}
      {children}
      <OnboardingTour />
      <NavBottom />
    </div>
  );
}
