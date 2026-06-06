import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Cliente de Stripe para NAVEGADOR. Requiere NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 * Nota: el flujo de checkout usa redirección a la URL de la Checkout Session
 * devuelta por el servidor, así que normalmente NO hace falta este cliente;
 * se deja disponible por si se usa Stripe.js (Elements) en el futuro.
 */
let _promise: Promise<Stripe | null> | null = null;
export function getStripeClient(): Promise<Stripe | null> {
  if (!_promise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    _promise = loadStripe(key);
  }
  return _promise;
}
