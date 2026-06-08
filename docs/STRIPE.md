# Integración Stripe — o2Wave

Guía para **Sebas** (lo que hay que hacer en el Stripe Dashboard y en Vercel).
Se completa por fases; esta sección cubre la **Fase 1 (setup)**.

## 1. Productos y precios a crear en Stripe (modo LIVE)

Crea cada producto con sus dos precios recurrentes (mensual y anual). Todos los
importes son **IVA 21% incluido** (con Stripe Tax activado, ver §4).

| Producto | Mensual | Anual | Notas |
|---|---|---|---|
| ONG mediana | 9 €/mes | 90 €/año | 12 meses por precio de 10 |
| Empresa Early Bird | 9 €/mes | 90 €/año | 9€ durante 12 meses, luego pasa a Standard (Fase 7) |
| Empresa Standard | 19 €/mes | 190 €/año | IG+FB, máx 30 posts/mes, sin pack semanal |
| Empresa Pro | 39 €/mes | 390 €/año | + TikTok + ilimitado + pack semanal + stats avanzadas |

> **ONG pequeña** es GRATIS: no se crea producto en Stripe, es un estado en `profiles`.

Para cada precio creado, copia su **price ID** (`price_...`) y guárdalo como
variable de entorno en Vercel (ver §2).

## 2. Variables de entorno en Vercel

| Variable | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (igual que la anterior; el prefijo `NEXT_PUBLIC_` la expone al navegador, solo si se usa Stripe.js) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (se obtiene al crear el webhook en la Fase 3) |
| `STRIPE_PRICE_ONG_MEDIANA_MENSUAL` | price ID |
| `STRIPE_PRICE_ONG_MEDIANA_ANUAL` | price ID |
| `STRIPE_PRICE_EARLYBIRD_MENSUAL` | price ID |
| `STRIPE_PRICE_EARLYBIRD_ANUAL` | price ID |
| `STRIPE_PRICE_STANDARD_MENSUAL` | price ID |
| `STRIPE_PRICE_STANDARD_ANUAL` | price ID |
| `STRIPE_PRICE_PRO_MENSUAL` | price ID |
| `STRIPE_PRICE_PRO_ANUAL` | price ID |

## 3. Códigos promocionales (crear en Stripe → Coupons + Promotion codes)

| Código | Descuento |
|---|---|
| `LANZAMIENTO` | 1er mes gratis (100% 1 mes) |
| `AMIGOS50` | 50% durante 3 meses |
| `BETA100` | 50% durante 12 meses |
| `ONGCAT` | 30% para siempre |
| `EMBAJADOR` | 6 meses gratis (100% 6 meses) |

El checkout activa `allow_promotion_codes: true`, así que el usuario los
introduce en la pantalla de Stripe Checkout.

## 4. Ajustes de cuenta

- **Stripe Tax**: activar (Settings → Tax) para auto-IVA por país. Marcar los
  precios como "IVA incluido".
- **Smart Retries**: Settings → Subscriptions and emails → reintentos durante
  7 días; tras agotarlos, la suscripción queda impagada (la app la trata como
  `suspendida`).
- **Cancelación**: al final del ciclo (sin reembolso). Se configurará en el
  Customer Portal (Fase 4).

## 5. Migración SQL (ejecutar en Supabase)

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_actual text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_ciclo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_estado text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_periodo_fin timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_gratis_usados int NOT NULL DEFAULT 0;
```

> Los usuarios existentes quedan con `plan_actual = NULL` (se tratan como
> `ong_pequena` gratis hasta que se suscriban). Sebas es admin → acceso
> indefinido (bypass por `es_admin`).

## 6. Webhook (Fase 3) — configurar en Stripe Dashboard

Crear un endpoint en **Developers → Webhooks** apuntando a
`https://www.o2wave.app/api/stripe/webhook` y copiar su **signing secret**
(`whsec_...`) a la env var `STRIPE_WEBHOOK_SECRET`.

Eventos a suscribir:
- `checkout.session.completed` → guarda `stripe_customer_id`, `stripe_subscription_id`, `plan_actual`, `plan_ciclo`, `plan_estado='activa'` en `profiles`. Si el plan es **Early Bird**, convierte la suscripción en un *Subscription Schedule* (ver §7).
- `customer.subscription.created` / `customer.subscription.updated` → refleja `plan_actual`/`plan_ciclo` según el precio activo (incluye el salto Early Bird→Standard), `plan_estado` (active→activa, past_due/unpaid→suspendida, canceled→cancelada) y `plan_periodo_fin`.
- `customer.subscription.deleted` → `plan_estado='cancelada'`, `plan_actual='ong_pequena'`.
- `invoice.payment_failed` → `plan_estado='suspendida'`.
- `invoice.payment_succeeded` → `plan_estado='activa'` + actualiza `plan_periodo_fin`.

El checkout (`/api/stripe/checkout`) crea la sesión en modo `subscription` con
`allow_promotion_codes`, `automatic_tax` (Stripe Tax) y mete `{user_id, plan, ciclo}`
en metadata (sesión y suscripción).

## 7. Early Bird → Standard (downgrade automático, Fase 7)

Stripe Checkout no crea schedules directamente. Patrón implementado:
1. El usuario paga **Early Bird** vía Checkout (precio 9€).
2. En `checkout.session.completed`, el webhook hace
   `subscriptionSchedules.create({ from_subscription })` y luego `update()` con 2 fases:
   - **Fase 1**: precio Early Bird con `duration` = **1 año** (anual) o **12 meses** (mensual).
   - **Fase 2**: precio **Standard** (sin `duration`/`end_date` → continúa indefinidamente).
   - `end_behavior: "release"`.
3. Al terminar la Fase 1, Stripe renueva ya al precio Standard y emite
   `customer.subscription.updated`, que actualiza `plan_actual='standard'` en `profiles`.

> Nota: el SDK usa `duration` (no `iterations`). No requiere configuración manual
> en el Dashboard; todo lo hace el webhook.

## Pendiente (fases siguientes)
- Fase 2: pantalla `/plans`.
- Fase 4: Customer Portal (`/api/stripe/portal`) + sección en `/perfil`.
- Fase 4: Customer Portal (`/api/stripe/portal`) + sección en `/perfil`.
- Fase 5/6: límites, posts gratis, suspensión.
- Fase 8: banner de pago fallido.

✅ Hecho: Fase 1 (setup), Fase 3 (checkout + webhook), Fase 7 (Early Bird → Standard vía Subscription Schedule).
