// Enriquecimiento ligero desde Wikipedia (ES). Best-effort: si no encuentra
// nada o falla/expira, devuelve null y la generación sigue sin estos datos.

const UA = "o2Wave/1.0 (https://o2wave.app)";

/** fetch con timeout (aborta para no colgar la generación). */
async function fetchJSON(url: string, ms = 4000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Intenta extraer del tema el nombre de una obra (película/serie). Heurística:
 * primero texto entre comillas; si no, lo que sigue a "por (la película/serie…)".
 */
export function extraerObra(tema: string): string | null {
  const comillas = tema.match(/[«"“”']([^«»"“”']{2,60})[»"“”']/);
  if (comillas?.[1]) return comillas[1].trim();
  const porAlgo = tema.match(/\bpor\s+(?:la\s+|el\s+|mi\s+|nuestra\s+|nuestro\s+)?(?:pel[ií]cula\s+|serie\s+|obra\s+|trabajo\s+en\s+|interpretaci[óo]n\s+(?:en|de)\s+|papel\s+(?:en|de)\s+)?([^,.;:!?\n]{2,60})/i);
  if (porAlgo?.[1]) return porAlgo[1].trim();
  return null;
}

/**
 * Busca la obra en Wikipedia ES y devuelve título + extracto introductorio
 * (recortado). Devuelve null si no hay obra detectable o no hay resultado.
 */
export async function enriquecerDesdeWikipedia(tema: string): Promise<{ titulo: string; extracto: string } | null> {
  const obra = extraerObra(tema);
  if (!obra) return null;

  // 1) opensearch → primer título coincidente.
  const search = await fetchJSON(
    `https://es.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&namespace=0&search=${encodeURIComponent(obra)}`
  );
  const titulo = Array.isArray(search) && Array.isArray(search[1]) ? (search[1][0] as string | undefined) : undefined;
  if (!titulo) return null;

  // 2) extracto introductorio en texto plano.
  const data = await fetchJSON(
    `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(titulo)}`
  ) as { query?: { pages?: Record<string, { extract?: string }> } } | null;
  const pages = data?.query?.pages;
  const extractoRaw = pages ? Object.values(pages)[0]?.extract : undefined;
  if (!extractoRaw) return null;

  const extracto = extractoRaw.replace(/\s+/g, " ").trim().slice(0, 600);
  return { titulo, extracto };
}
