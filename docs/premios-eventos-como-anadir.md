# Premios y eventos — cómo añadir más (Plan Estrella)

La tabla `premios_eventos` alimenta el enriquecimiento automático de posts de
agradecimiento: cuando el **tema** que escribe el usuario menciona un premio
del catálogo, el sistema añade al prompt de la IA el hashtag y cuentas oficiales
del premio, y (si detecta una obra) un extracto de Wikipedia.

## Cómo funciona (resumen técnico)

- `src/lib/premios.ts` → `detectarPremio()`: carga las filas y busca cada
  `keyword` como **palabra completa** dentro del tema normalizado (minúsculas y
  sin tildes). Devuelve el primer premio que haga match.
- `src/lib/wikipedia.ts` → `enriquecerDesdeWikipedia()`: intenta extraer el
  nombre de la obra del tema (texto entre comillas, o lo que sigue a "por…") y
  busca su ficha en Wikipedia ES.
- `src/app/api/generate-text/route.ts`: si hay premio, inyecta el bloque de
  contexto en el prompt. Todo el flujo está en try/catch: si la tabla no existe
  o algo falla, la generación normal **no se ve afectada**.

## Añadir un premio nuevo

Inserta una fila en Supabase (SQL Editor):

```sql
INSERT INTO public.premios_eventos
  (slug, nombre, sector, pais, hashtag_oficial, instagram_oficial, twitter_oficial, web_oficial, mes_celebracion, keywords, descripcion)
VALUES
  ('ondas', 'Premios Ondas', 'musica', 'ES', '#PremiosOndas', '@premios_ondas', '@PremiosOndas',
   'https://www.premiosondas.com', 11,
   ARRAY['ondas','premios ondas','premio ondas'],   -- en minúsculas y SIN tildes
   'Premios de radio, televisión, música y cine concedidos por Radio Barcelona (Cadena SER).')
ON CONFLICT (slug) DO NOTHING;
```

### Reglas para las `keywords`
- Siempre en **minúsculas y sin tildes** (el código normaliza el tema igual).
- Incluye singular/plural y variantes ("ondas", "premios ondas", "premio ondas").
- Para nombres que son **palabras comunes** (p. ej. "iris", "ondas"), evita la
  forma suelta y usa solo variantes multi-palabra ("premios iris") para no
  detectar falsos positivos.
- El match es por **palabra completa**, así que "goya" no se dispara dentro de
  otra palabra.

### Campos
- `sector`: 'cine' | 'tv' | 'musica' | 'deporte' | 'literatura'.
- `mes_celebracion`: 1–12 (informativo, para usos futuros).
- `hashtag_oficial` / `instagram_oficial` / `twitter_oficial`: **verifícalos** en
  la web/redes oficiales antes de añadirlos (cambian con el tiempo).

## Editar o corregir un premio existente

```sql
UPDATE public.premios_eventos
SET instagram_oficial = '@nuevo_handle', hashtag_oficial = '#NuevoHashtag'
WHERE slug = 'goya';
```

No hace falta tocar código: el catálogo se lee de la BD en cada generación.

## Roadmap
- Fase 2: 10–20 premios más (música, deporte, literatura).
- Fase 3: TMDB para cine internacional (director/reparto estructurado).
- Fase 4: "equipo habitual" del usuario (manager, agencia, productores).
