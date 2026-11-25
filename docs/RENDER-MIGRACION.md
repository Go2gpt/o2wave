# Migración de o2Wave: Vercel Pro → Render

**Objetivo:** bajar el coste de 20 $/mes (Vercel Pro) a 7 $/mes (Render Starter)
sin perder ninguna función.

**Regla de oro:** no se toca Vercel ni el DNS hasta que TODO esté probado en
Render. La vuelta atrás siempre es posible (devolver el CNAME a Vercel).

---

## Por qué Render y no otra cosa

- **Vercel solo tiene dos escalones:** Hobby (gratis) y Pro (20 $). No hay plan
  intermedio. Hobby no sirve: corta las funciones a ~10–60 s y los **Reels y el
  pack semanal tardan hasta 300 s** (`maxDuration: 300`), además de no permitir
  uso comercial.
- **Render Starter (7 $)** no tiene límite de duración de función, así que Reels
  y pack siguen funcionando. Ese es el ahorro real.
- **Riesgo a vigilar:** el Starter trae 512 MB de RAM. `sharp` + `ffmpeg` + PDF a
  la vez (un Reel o el pack) podrían agotarla. Si pasa, el plan siguiente
  (Standard, 25 $) sería más caro que Vercel → en ese caso NO migramos.

## Lo que se confirmó leyendo el repo

- Next 14.2.35, servidor Node normal. No usa nada propio de Vercel (`@vercel/*`,
  `waitUntil`, variables `VERCEL_*`). `next start` escucha en el `PORT` de Render.
- `sharp` (imágenes) y `ffmpeg-static` (Reels) traen binario precompilado para
  Linux → funcionan en Render sin tocar nada.
- **Dominio propio `www.o2wave.app`.** El DNS está en **IONOS** (no en Vercel) y
  el **correo (MX `mx*.ionos.es`) también** → cancelar Vercel NO afecta al correo.
  Como mantenemos el mismo dominio, **no hay que tocar Meta, Stripe ni Supabase**.
- Las Redirect URIs de Meta se forman a partir de `SITE_URL`
  (`src/lib/meta/config.ts`); con el mismo dominio no cambian.

---

## Fase 0 — Preparación (no rompe nada)

1. **Cuenta en Render** (la crea Sebas): registro en https://render.com + tarjeta.
   Conectar la cuenta de GitHub `Go2gpt`.
2. Confirmar la **región de Supabase** (panel de Supabase → Settings → General).
   Se asume Frankfurt / `eu-central-1`; si no, ajustar `region` en `render.yaml`.
3. Exportar las variables de Vercel (panel de Vercel → Settings → Environment
   Variables). Son las 29 que lista `render.yaml`.
   - **`TOKEN_ENC_KEY` tiene que ser idéntica.**
   - **No** crear `NODE_ENV`.

## Fase 1 — Crear el servicio en Render (en paralelo, sin tráfico real)

1. En Render: **New → Blueprint** y apuntar al repo `Go2gpt/o2wave`. Render lee
   `render.yaml` y crea el Web Service `o2wave` (plan Starter, Frankfurt).
2. Rellenar en el panel las 29 variables `sync: false` (copiadas de Vercel).
3. Primer deploy. Queda disponible en una URL temporal `*.onrender.com`.

## Fase 2 — Pruebas en `*.onrender.com` (sin tocar producción)

- Web y **login** (añadir temporalmente la URL `onrender` en Supabase →
  Authentication → URL Configuration).
- **Imágenes** (`sharp`): generar un banner.
- **ffmpeg**: abrir `/api/admin/autopost/diagnostico`.
- **Prueba clave de RAM:** hacer **un Reel completo y un pack semanal con PDF**,
  vigilando la memoria en Render → Metrics. ⚠️ Si se queda sin RAM, PARAR aquí.
- Disparar a mano los crons que no tocan datos reales con
  `curl -H "Authorization: Bearer <CRON_SECRET>" <url>`. (Los dos de autopost se
  prueban justo tras el cambio de DNS, en Fase 3, para no publicar por duplicado.)

## Fase 3 — Cambio de servidor (un solo momento, con vuelta atrás)

1. En Render → Settings → Custom Domain: añadir `www.o2wave.app` y el dominio raíz.
2. En **IONOS** (panel DNS de `o2wave.app`): cambiar el **CNAME de `www`** para que
   apunte al destino que indique Render, y el registro **A** del dominio raíz.
   El **MX (correo) no se toca.**
3. Esperar a que Render emita el certificado TLS.
4. **Mover los crons** (ver tabla abajo): activar los de cron-job.org y
   **quitar los de Vercel** (borrar `vercel.json` + desconectar Git en el proyecto
   de Vercel) — en el mismo momento, para que no corran por duplicado.
5. Comprobar: OAuth de Meta/Instagram, webhook de Stripe, y el primer cron horario
   de publicación.

**Vuelta atrás:** devolver el CNAME de `www` a `cname.vercel-dns.com` en IONOS.
Vercel sigue intacto.

## Fase 4 — Cancelar Vercel

Tras 1–2 semanas estables: bajar el proyecto de Vercel a Hobby o borrarlo.
(El DNS está en IONOS, así que no hay registros que rescatar de Vercel.)

---

## Los 5 crons en cron-job.org

Gratis, admite cabeceras y horario UTC. Crear 5 trabajos, todos con:

- **Método:** GET
- **Cabecera:** `Authorization: Bearer <CRON_SECRET>`
- **Zona horaria:** UTC (para que coincidan con los números actuales de Vercel)
- Activar los avisos por fallo (email).

| Endpoint | URL | Horario (UTC) | Cuándo |
|---|---|---|---|
| pack-semanal | `https://www.o2wave.app/api/cron/pack-semanal` | `0 7 * * 1` | Lunes 07:00 |
| autopost-generar | `https://www.o2wave.app/api/cron/autopost-generar` | `0 8 * * 1` | Lunes 08:00 |
| autopost-publicar | `https://www.o2wave.app/api/cron/autopost-publicar` | `0 * * * *` | Cada hora en punto |
| autopost-tokens | `https://www.o2wave.app/api/cron/autopost-tokens` | `0 6 * * *` | Cada día 06:00 |
| reel-recordatorio | `https://www.o2wave.app/api/cron/reel-recordatorio` | `0 8 * * 4` | Jueves 08:00 |

> **Nota sobre el tiempo límite:** cron-job.org corta la conexión a los 30 s y
> algunos crons tardan hasta 300 s. Next sigue ejecutando la ruta aunque el
> cliente se desconecte — **confirmar en los logs de Render** que terminan. Si no,
> alternativa gratis: un workflow programado de GitHub Actions con
> `curl --max-time 600` (retraso de 5–15 min, aceptable porque `autopost-publicar`
> recoge todo lo que tenga `publish_at <= now`).

---

## Checklist de riesgos (de la revisión del código)

- [ ] RAM del Starter aguanta un Reel y el pack (si no → no migrar).
- [ ] `TOKEN_ENC_KEY` idéntica a la de Vercel.
- [ ] `NODE_ENV` NO creada a mano en Render.
- [ ] Variables `NEXT_PUBLIC_*` puestas ANTES del primer build (se incrustan al compilar).
- [ ] Crons de Vercel y Render NO corriendo a la vez (cambio en un solo momento).
- [ ] Logs confirman que los crons largos terminan pese al corte de cron-job.org a 30 s.
