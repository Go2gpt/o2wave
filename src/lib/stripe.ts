import Stripe from "stripe";

/**
 * Cliente de Stripe para SERVIDOR (route handlers, webhooks). Lazy: no se
 * instancia al importar, así el build no falla si la clave aún no está puesta.
 * Usa SIEMPRE STRIPE_SECRET_KEY y nunca llega al cliente.
 */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
    // Sin apiVersion explícita: usa la versión por defecto del SDK/cuenta.
    _stripe = new Stripe(key);
  }
  return _stripe;
}
