// Perfil de demo (solo admin): permite a Sebas demostrar la app como distintos
// tipos de cliente sin cambiar su cuenta real. NO toca BBDD; es por petición.

export type DemoPerfil = "neutral" | "ong" | "empresa" | "creator";
export const DEMO_PERFILES: DemoPerfil[] = ["neutral", "ong", "empresa", "creator"];

/**
 * Resuelve el perfil efectivo de demo. SOLO se aplica si el usuario es admin y
 * el valor es uno de los 4 válidos; en cualquier otro caso devuelve null
 * (→ comportamiento real del perfil, sin override). Safety + security net.
 */
export function resolverDemoPerfil(demoProfile: unknown, esAdmin: boolean | null | undefined): DemoPerfil | null {
  if (!esAdmin) return null;
  return typeof demoProfile === "string" && (DEMO_PERFILES as string[]).includes(demoProfile)
    ? (demoProfile as DemoPerfil)
    : null;
}

/** Línea de rol para el system prompt de texto según el perfil de demo. */
export function rolDemoTexto(perfil: DemoPerfil): string {
  switch (perfil) {
    case "neutral": return "Eres un experto en comunicación y redacción para redes sociales. Genera contenido EXACTAMENTE sobre el tema que pide el usuario, sin sesgos temáticos ni de causa social. No fuerces ningún ángulo solidario.";
    case "empresa": return "Eres un experto en comunicación de marca para empresas. Tono profesional y comercial, lenguaje claro y directo, enfoque de negocio, sin causa social explícita.";
    case "creator": return "Eres un experto en contenido para creadores y freelancers. Tono personal y cercano, en primera persona, estilo storytelling.";
    case "ong": return "Eres un experto en comunicación para el tercer sector y PYMEs.";
  }
}
