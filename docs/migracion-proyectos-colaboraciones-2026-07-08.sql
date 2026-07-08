-- ============================================================================
-- Migración: Proyectos propios vs Colaboraciones + Novedad semanal (v2.4)
-- Fecha: 2026-07-08
-- Encargo: encargo-pack-fix-imagen-y-estrategia-2026-07-08.md (Problema 2 + 3)
--
-- Separa "lo que ejecuta Generación o2" (proyectos_propios) de "lo que solo
-- apoya" (colaboraciones), para que el generador de packs no se atribuya
-- proyectos ajenos (ej. AMIC). Añade el flag de "novedad de la semana" que
-- decide si el pack incluye o no proyectos propios.
--
-- servicios_programas se MANTIENE (retrocompatibilidad) y se marca deprecated
-- en la UI. Los packs nuevos usan los dos JSONB.
--
-- NOTA (Sebas): aplicar en Supabase → SQL Editor. Idempotente.
-- El UPDATE del final precarga TUS datos auditados (08-jul-2026); ajústalos
-- luego en /perfil si hace falta.
-- ============================================================================

alter table profiles add column if not exists proyectos_propios   jsonb   default '[]'::jsonb;
alter table profiles add column if not exists colaboraciones       jsonb   default '[]'::jsonb;
alter table profiles add column if not exists novedad_semanal_texto  text   null;
alter table profiles add column if not exists novedad_semanal_activa boolean default false;

-- ---------------------------------------------------------------------------
-- Seed auditado para la cuenta de Sebas (Generación o2).
-- Dollar-quoting ($json$ … $json$) → no hace falta escapar comillas simples.
-- ---------------------------------------------------------------------------
update profiles set proyectos_propios = $json$
[
  {
    "nombre": "Papel reciclado Hospital Sagrat Cor",
    "cifra_clave": "324 toneladas CO₂ evitadas, 450.000 hojas/mes",
    "resumen_visual": "Contenedores de papel, ambiente hospitalario, gestión responsable de residuos",
    "framing_correcto": "En Generación o2 gestionamos el reciclaje de papel del Hospital Sagrat Cor…",
    "matiz": null
  },
  {
    "nombre": "Formaciones sanitarias en diversidad sexual LGTBI+",
    "cifra_clave": "+400 profesionales formados, valoración 4,8/5",
    "resumen_visual": "Aula de formación con profesionales sanitarios diversos, material inclusivo LGTBI+",
    "framing_correcto": "Formamos a profesionales sanitarios en diversidad sexual…",
    "matiz": null
  },
  {
    "nombre": "Asistencia doméstica gratuita",
    "cifra_clave": null,
    "resumen_visual": "Voluntario acompañando a persona mayor en su casa en Barcelona",
    "framing_correcto": "Nuestro programa de Asistencia Doméstica gratuita…",
    "matiz": null
  },
  {
    "nombre": "Voluntariado internacional",
    "cifra_clave": null,
    "resumen_visual": "Voluntarios en misión internacional, contexto local del destino",
    "framing_correcto": "El voluntariado internacional de Generación o2…",
    "matiz": null
  },
  {
    "nombre": "Galería Ópera Lounge",
    "cifra_clave": "4 años activa como espacio solidario",
    "resumen_visual": "Sala de exposición con arte, ambiente cálido, evento solidario",
    "framing_correcto": "Galería Ópera Lounge, un espacio cedido a Generación o2 donde organizamos exposiciones y eventos solidarios",
    "matiz": "Espacio cedido por Ópera Lounge. Los eventos y exposiciones son propios; el espacio no. NUNCA decir 'nuestra galería' / 'nuestro edificio' / 'poseemos'."
  },
  {
    "nombre": "Acompañamiento en pruebas médicas",
    "cifra_clave": null,
    "resumen_visual": "Voluntario acompañando a persona mayor en hospital, sala de espera de pruebas médicas",
    "framing_correcto": "Nuestro proyecto de acompañamiento en pruebas médicas…",
    "matiz": null
  }
]
$json$::jsonb,
colaboraciones = $json$
[
  {
    "entidad": "AMIC",
    "url": "https://ongamic.org",
    "proyecto": "Apadrinamiento de niños en Guinea-Bissau",
    "pais": "Guinea-Bissau",
    "framing_correcto": "Colaboramos con la ONG AMIC en la búsqueda de padrinos para sus niños de Guinea-Bissau. AMIC es una ONGD catalana fundada en 2004 (sede Sant Antoni de Vilamajor) que trabaja principalmente en Guinea-Bissau con Casa Emanuel (ASOCE) en el barrio de Hàfia, Bissau. Cada padrino cubre escolarización, libros, uniforme y comida diaria de un niño concreto.",
    "framing_prohibido": "nuestro programa AMIC | nuestro apadrinamiento | en Generación o2 apadrinamos | nuestros niños AMIC",
    "cifra_clave": "20 €/mes por niño (escuela + libros + uniforme + comedor diario)",
    "descripcion_imagen_base": "Scene in Guinea-Bissau, West Africa. Afro-descendant children in local educational context: simple classroom with blackboard, school uniforms, books; or children's dining hall with plate of food; or exterior of African school with tropical vegetation. Warm natural lighting. Dignity, joy, everyday life — NEVER explicit poverty scenes nor 'poverty porn' aesthetics. NO logos of Generación o2 or European organizations. Documentary photojournalism style, respectful composition.",
    "tipo_relacion": "colaboracion",
    "recurrente": true
  },
  {
    "entidad": "Piel Mariposa",
    "url": null,
    "proyecto": "Desfile solidario",
    "pais": "Barcelona",
    "framing_correcto": "Apoyamos a Piel Mariposa con donaciones y lo que nos pidan. Piel Mariposa es una iniciativa externa con la que colaboramos.",
    "framing_prohibido": "nuestro desfile | organizamos Piel Mariposa | nuestro Piel Mariposa",
    "cifra_clave": "+3.000 € recaudados en la última edición",
    "descripcion_imagen_base": "Runway or backstage of solidarity fashion show. Diverse models of different bodies, ages, abilities. Barcelona context. Warm inclusive atmosphere, professional photography, ethical fashion aesthetics.",
    "tipo_relacion": "apoyo_puntual",
    "recurrente": false
  }
]
$json$::jsonb
where email = 'sebastian@generacion-o2.org';
