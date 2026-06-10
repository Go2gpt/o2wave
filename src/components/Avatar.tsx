interface AvatarProfile {
  nombre_entidad?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

/** Iniciales (2 letras) a partir del nombre o, en su defecto, del email. */
export function obtenerIniciales(texto: string): string {
  const limpio = texto.trim().split("@")[0].replace(/[+._-]/g, " ").trim();
  const palabras = limpio.split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) return (palabras[0][0] + palabras[1][0]).toUpperCase();
  return (limpio.slice(0, 2) || "U").toUpperCase();
}

/** Avatar: logo de la entidad si existe; si no, iniciales sobre gradiente de marca. */
export default function Avatar({ profile }: { profile: AvatarProfile | null }) {
  if (profile?.logo_url) {
    return (
      <img src={profile.logo_url} alt={profile.nombre_entidad ?? "Usuario"}
        className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-white" />
    );
  }
  const iniciales = obtenerIniciales(profile?.nombre_entidad ?? profile?.email ?? "U");
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white font-semibold text-sm"
      style={{ background: "linear-gradient(135deg, #f9b23b 0%, #93bf30 100%)" }}>
      {iniciales}
    </div>
  );
}
