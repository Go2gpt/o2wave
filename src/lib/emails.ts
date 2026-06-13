import { getResend, FROM_EMAIL } from "@/lib/resend";
import { SITE_URL } from "@/lib/siteUrl";
import { planMeta } from "@/lib/plans";
import type { PlanActual, PlanCiclo } from "@/types";

/** Buzón interno de avisos de suscripción (constante; no env var). */
export const ADMIN_EMAIL = "suscripciones@generacion-o2.org";

/* --------------------------------- helpers --------------------------------- */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nombrePlan(plan: PlanActual): string {
  return planMeta(plan)?.nombre || plan;
}

/** Importe legible derivado del catálogo (NO hardcodeado). */
function importeTexto(plan: PlanActual, ciclo: PlanCiclo): string {
  const m = planMeta(plan);
  if (!m) return "";
  const precio = ciclo === "anual" ? m.precioAnual : m.precioMensual;
  if (precio == null) return "Gratis";
  return `${precio}€${ciclo === "anual" ? "/año" : "/mes"}`;
}

function featuresHtml(plan: PlanActual): string {
  const feats = planMeta(plan)?.features ?? [];
  return `<ul style="padding-left:18px;margin:8px 0">${feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "tu próxima fecha de facturación";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

/** Plantilla branded para emails al usuario. */
function layout(inner: string): string {
  return `
  <div style="background:#f6f7f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="padding:20px 24px;border-bottom:1px solid #f0f0f0">
        <span style="font-size:22px;font-weight:800;color:#93bf30">o²</span><span style="font-size:22px;font-weight:800;color:#f9b23b">Wave</span>
      </div>
      <div style="padding:24px;color:#0F0F0F;line-height:1.6;font-size:15px">${inner}</div>
      <div style="padding:16px 24px;border-top:1px solid #f0f0f0;text-align:center">
        <p style="margin:0;color:#93bf30;font-style:italic;font-size:13px">Comunicas tú, ayudas a muchos.</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:11px">o2Wave · www.o2wave.app</p>
      </div>
    </div>
  </div>`;
}

function boton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#f9b23b;color:#fff;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px;margin:8px 0">${esc(label)}</a>`;
}

/** Envío tolerante a fallos: nunca relanza; loguea éxito/fallo. */
async function enviar(to: string, subject: string, html: string, etiqueta: string): Promise<void> {
  if (!to) { console.error(`email ${etiqueta}: sin destinatario`); return; }
  try {
    await getResend().emails.send({ from: FROM_EMAIL, to, subject, html });
    console.log(`email ${etiqueta} → ${to}`);
  } catch (e) {
    console.error(`email ${etiqueta} a ${to} falló:`, e instanceof Error ? e.message : e);
  }
}

/* ------------------------------ emails usuario ------------------------------ */

export async function enviarBienvenida(p: { to: string; nombre: string; plan: PlanActual; ciclo: PlanCiclo; fechaRenovacionISO: string | null }): Promise<void> {
  const np = nombrePlan(p.plan);
  const inner = `
    <p>Hola ${esc(p.nombre) || ""},</p>
    <p>¡Gracias por suscribirte a o2Wave! Tu plan <strong>${esc(np)}</strong> ya está activo.</p>
    <p><strong>Qué incluye:</strong></p>
    ${featuresHtml(p.plan)}
    <p><strong>Próxima renovación:</strong> ${fmtFecha(p.fechaRenovacionISO)} (${importeTexto(p.plan, p.ciclo)} con IVA incluido).</p>
    <p>Puedes empezar a generar contenido aquí:</p>
    <p>${boton(SITE_URL, "Ir a o2Wave")}</p>
    <p>Si tienes cualquier duda, responde a este correo o escríbenos a ${ADMIN_EMAIL}.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— Equipo o2Wave</p>`;
  const subject = p.nombre ? `¡Bienvenido/a a o2Wave, ${p.nombre}! 🌊` : "¡Bienvenido/a a o2Wave! 🌊";
  await enviar(p.to, subject, layout(inner), "bienvenida");
}

export async function enviarCancelacionUsuario(p: { to: string; nombre: string; plan: PlanActual; esOng: boolean }): Promise<void> {
  const np = nombrePlan(p.plan);
  const parrafoGratis = p.esOng
    ? `<p>Tu cuenta sigue activa con el plan gratuito <strong>ONG pequeña</strong>, así que puedes seguir usando o2Wave con las funciones básicas.</p>`
    : `<p>Tu cuenta seguirá activa hasta el final del periodo ya facturado. Después podrás reactivar tu suscripción cuando quieras.</p>`;
  const inner = `
    <p>Hola ${esc(p.nombre) || ""},</p>
    <p>Hemos procesado la cancelación de tu suscripción a <strong>${esc(np)}</strong>. No se te volverá a cobrar.</p>
    ${parrafoGratis}
    <p>Si te has dado de baja por algún problema concreto, nos encantaría saberlo — respondiendo a este correo nos ayudas a mejorar.</p>
    <p>Gracias por haber confiado en nosotros.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— Equipo o2Wave</p>`;
  await enviar(p.to, "Suscripción cancelada — gracias por probar o2Wave", layout(inner), "cancelacion-usuario");
}

export async function enviarFalloCobroUsuario(p: { to: string; nombre: string; plan: PlanActual; ciclo: PlanCiclo }): Promise<void> {
  const np = nombrePlan(p.plan);
  // TODO(Fase 4): cuando el Customer Portal esté configurado, enlazar a /api/stripe/portal
  // en vez de a /perfil. De momento llevamos al perfil para actualizar el método de pago.
  const urlPortal = `${SITE_URL}/perfil`;
  const inner = `
    <p>Hola ${esc(p.nombre) || ""},</p>
    <p>Hemos intentado renovar tu suscripción de <strong>${esc(np)}</strong> (${importeTexto(p.plan, p.ciclo)}) y el cobro ha fallado. Suele ser por una tarjeta caducada, sin fondos suficientes, o un bloqueo del banco.</p>
    <p>Stripe lo reintentará automáticamente en los próximos días, pero te recomendamos actualizar tu método de pago para evitar perder el servicio:</p>
    <p>${boton(urlPortal, "Actualizar tarjeta")}</p>
    <p>Si tienes cualquier problema, escríbenos a ${ADMIN_EMAIL} y te ayudamos.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— Equipo o2Wave</p>`;
  await enviar(p.to, "⚠️ No hemos podido cobrar tu suscripción de o2Wave", layout(inner), "fallo-cobro-usuario");
}

/** Aviso de que el pack semanal automático ya está generado y disponible en la app. */
export async function enviarPackListo(p: { to: string; nombre: string; packId?: string }): Promise<void> {
  // Deep-link al pack recién generado si tenemos su id; si no, al listado.
  const url = p.packId ? `${SITE_URL}/pack/${p.packId}` : `${SITE_URL}/pack`;
  const inner = `
    <p>Hola ${esc(p.nombre) || ""},</p>
    <p>Tu plan de contenido para esta semana ya está disponible en la app. Días de posts listos para que solo tengas que publicar.</p>
    <p>${boton(url, "Ver mi pack")}</p>
    <p>Si tienes cualquier duda, escríbenos a ${ADMIN_EMAIL}.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">— Equipo o2Wave</p>`;
  await enviar(p.to, "Tu pack semanal de o2Wave está listo ✨", layout(inner), "pack-listo");
}

/* ------------------------------- emails admin ------------------------------- */

function adminLista(filas: [string, string][]): string {
  const items = filas.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;color:#0F0F0F;line-height:1.6;font-size:14px"><ul style="padding-left:18px">${items}</ul></div>`;
}

export async function enviarAdminNueva(p: { nombre: string; email: string; plan: PlanActual; ciclo: PlanCiclo; tipoEntidad: string; stripeCustomerId: string; fechaISO: string }): Promise<void> {
  const np = nombrePlan(p.plan);
  const html = `<p>Nueva suscripción en o2Wave:</p>${adminLista([
    ["Usuario", `${p.nombre} (${p.email})`],
    ["Plan", `${np} (${p.ciclo})`],
    ["Importe", `${importeTexto(p.plan, p.ciclo)} (IVA incluido)`],
    ["Tipo de entidad", p.tipoEntidad || "—"],
    ["ID Stripe", p.stripeCustomerId || "—"],
    ["Fecha", fmtFecha(p.fechaISO)],
  ])}`;
  await enviar(ADMIN_EMAIL, `🎉 Nueva suscripción: ${np} — ${p.email}`, html, "admin-nueva");
}

export async function enviarAdminBaja(p: { nombre: string; email: string; plan: PlanActual; ciclo: PlanCiclo; fechaInicioISO: string | null; stripeCustomerId: string }): Promise<void> {
  const np = nombrePlan(p.plan);
  const html = `<p>Un usuario ha cancelado su suscripción:</p>${adminLista([
    ["Usuario", `${p.nombre} (${p.email})`],
    ["Plan que tenía", `${np} (${p.ciclo})`],
    ["Llevaba suscrito desde", fmtFecha(p.fechaInicioISO)],
    ["ID Stripe", p.stripeCustomerId || "—"],
  ])}`;
  await enviar(ADMIN_EMAIL, `👋 Baja: ${np} — ${p.email}`, html, "admin-baja");
}

export async function enviarAdminFallo(p: { nombre: string; email: string; plan: PlanActual; ciclo: PlanCiclo; motivo: string; fechaReintentoISO: string | null; stripeCustomerId: string }): Promise<void> {
  const np = nombrePlan(p.plan);
  const html = `<p>Ha fallado un cobro automático:</p>${adminLista([
    ["Usuario", `${p.nombre} (${p.email})`],
    ["Plan", `${np} (${p.ciclo})`],
    ["Importe", importeTexto(p.plan, p.ciclo)],
    ["Motivo de Stripe", p.motivo],
    ["Próximo reintento de Stripe", fmtFecha(p.fechaReintentoISO)],
    ["ID Stripe", p.stripeCustomerId || "—"],
  ])}<p style="font-family:Arial,sans-serif;color:#6b7280;font-size:13px">Stripe lo reintentará automáticamente. Si tras varios intentos sigue fallando, la suscripción quedará suspendida y el usuario recibirá el aviso correspondiente.</p>`;
  await enviar(ADMIN_EMAIL, `⚠️ Cobro fallido: ${p.email} — ${importeTexto(p.plan, p.ciclo)}`, html, "admin-fallo");
}
