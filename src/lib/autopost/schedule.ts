/**
 * Cálculo de la próxima fecha/hora de publicación a partir de la config de la
 * cuenta (dias_horas: [{dia:1..7 (lun=1), hora:"HH:MM"}] en hora de Madrid).
 * Devuelve un instante UTC (ISO) para guardar en autopost_posts.publish_at.
 * Solo servidor.
 */

export interface FranjaHoraria { dia: number; hora: string } // dia 1=lun..7=dom

/** Instante UTC (Date) para una hora de pared de Europe/Madrid (respeta DST). */
function madridToUtc(y: number, mo: number, d: number, hh: number, mm: number): Date {
  const wallAsUtc = Date.UTC(y, mo, d, hh, mm);
  const madridWall = new Date(new Date(wallAsUtc).toLocaleString("en-US", { timeZone: "Europe/Madrid" })).getTime();
  const utcWall = new Date(new Date(wallAsUtc).toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const offset = utcWall - madridWall; // UTC - Madrid (ms)
  return new Date(wallAsUtc + offset);
}

/** Día de la semana (1=lun..7=dom) de un instante, en hora de Madrid. */
function diaSemanaMadrid(d: Date): number {
  const wd = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" })).getDay(); // 0=dom..6=sáb
  return wd === 0 ? 7 : wd;
}

/**
 * Próxima publicación futura entre las franjas configuradas (busca en los
 * próximos 14 días). Sin franjas válidas → mañana a las 10:00 (Madrid).
 */
export function proximaPublicacion(franjas: FranjaHoraria[] | null | undefined, desde: Date = new Date()): string {
  const validas = (franjas || []).filter((f) => f && f.dia >= 1 && f.dia <= 7 && /^\d{1,2}:\d{2}$/.test(f.hora || ""));

  if (!validas.length) {
    const y = desde.getUTCFullYear(), mo = desde.getUTCMonth(), d = desde.getUTCDate();
    return madridToUtc(y, mo, d + 1, 10, 0).toISOString();
  }

  let mejor: Date | null = null;
  for (let add = 0; add <= 14; add++) {
    const dref = new Date(desde.getTime() + add * 24 * 3600 * 1000);
    const y = dref.getUTCFullYear(), mo = dref.getUTCMonth(), d = dref.getUTCDate();
    // Día de la semana (Madrid) del día candidato al mediodía (evita bordes DST).
    const dow = diaSemanaMadrid(madridToUtc(y, mo, d, 12, 0));
    for (const f of validas.filter((x) => x.dia === dow)) {
      const [hh, mm] = f.hora.split(":").map((n) => parseInt(n, 10));
      const cand = madridToUtc(y, mo, d, hh, mm);
      if (cand.getTime() > desde.getTime() && (!mejor || cand.getTime() < mejor.getTime())) mejor = cand;
    }
    if (mejor && add >= 1) break; // ya tenemos la más próxima dentro de la semana
  }
  return (mejor || madridToUtc(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate() + 1, 10, 0)).toISOString();
}

/** Semáforo del token según su caducidad (null = permanente/System User → verde). */
export function estadoToken(expiraAt: string | null): "verde" | "amarillo" | "rojo" {
  if (!expiraAt) return "verde";
  const dias = (new Date(expiraAt).getTime() - Date.now()) / (24 * 3600 * 1000);
  if (dias <= 7) return "rojo";
  if (dias <= 30) return "amarillo";
  return "verde";
}
