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

## Pendiente (fases siguientes)
- Fase 2: pantalla `/plans`.
- Fase 3: `/api/stripe/checkout`, `/api/stripe/webhook` + configurar el webhook
  en Stripe Dashboard apuntando a `https://o2wave.app/api/stripe/webhook`.
- Fase 4: Customer Portal (`/api/stripe/portal`) + sección en `/perfil`.
- Fase 5/6: límites, posts gratis, suspensión.
- Fase 7: downgrade Early Bird → Standard.
- Fase 8: banner de pago fallido.
