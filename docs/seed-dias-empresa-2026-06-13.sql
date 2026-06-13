-- ============================================================================
-- Seed de días clave empresariales/transversales para o2Wave
-- Fecha: 2026-06-13
-- Ejecutar en Supabase (SQL editor). Idempotente en lo posible.
--
-- Modelo: las CATEGORÍAS viven en código (src/lib/categorias.ts, con su campo
-- aplicable_a). Esta migración solo siembra filas en la tabla `dias_clave`.
--
-- Columnas usadas de dias_clave: mes, dia, nombre, categoria, ambito,
-- relevancia, descripcion, recurrente, ano_especifico.
--   - ambito: 'internacional' | 'espana'
--   - relevancia: 'alto' | 'medio'
--   - recurrente=true (default) → se repite cada año por (mes,dia)
--   - recurrente=false + ano_especifico → fecha puntual de un año (para fechas
--     que cambian de día cada año: Día de la Madre, Black Friday, Cyber Monday,
--     Hora del Planeta). Sembramos 2026-2028.
-- ============================================================================

-- 0) Asegurar columnas para fechas dinámicas (no-op si ya existen).
ALTER TABLE public.dias_clave
  ADD COLUMN IF NOT EXISTS recurrente boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ano_especifico integer;

-- Evita duplicar el seed si se re-ejecuta: borra primero las filas de estas
-- categorías nuevas (no toca las categorías ONG existentes).
DELETE FROM public.dias_clave
WHERE categoria IN (
  'fechas_comerciales','cliente_atencion','ventas_marketing',
  'innovacion_tecnologia','rrhh_equipo','sostenibilidad_empresa',
  'educacion_formacion','industria_emprendimiento'
);

-- 1) FECHAS FIJAS (recurrentes por mes/día) -----------------------------------
INSERT INTO public.dias_clave (mes, dia, nombre, categoria, ambito, relevancia, descripcion) VALUES
-- fechas_comerciales
(2, 14,  'San Valentín',                  'fechas_comerciales', 'internacional', 'alto',  'Día de los enamorados; campañas de regalo y afecto.'),
(3, 19,  'Día del Padre (España)',        'fechas_comerciales', 'espana',        'alto',  'Celebración del padre en España.'),
(10,31,  'Halloween',                     'fechas_comerciales', 'internacional', 'medio', 'Campañas temáticas de otoño/terror.'),
(1, 7,   'Inicio rebajas de invierno',    'fechas_comerciales', 'espana',        'medio', 'Arranque habitual de las rebajas de invierno.'),
(12,25,  'Navidad',                       'fechas_comerciales', 'internacional', 'alto',  'Campaña navideña.'),
(1, 6,   'Reyes',                         'fechas_comerciales', 'espana',        'alto',  'Día de Reyes; cierre de la campaña navideña.'),
-- cliente_atencion
(3, 15,  'Día Mundial del Consumidor',    'cliente_atencion',   'internacional', 'medio', 'Derechos del consumidor.'),
(3, 4,   'Día Mundial del Cliente',       'cliente_atencion',   'internacional', 'medio', 'Agradecimiento y fidelización de clientes.'),
-- ventas_marketing
(1, 27,  'Día Mundial de las Redes Sociales','ventas_marketing', 'internacional', 'medio', 'Community management y social media.'),
(1, 28,  'Día Mundial del Email',         'ventas_marketing',   'internacional', 'medio', 'Comunicación por email.'),
(6, 25,  'Día Mundial del Email Marketing','ventas_marketing',   'internacional', 'medio', 'Campañas de email marketing.'),
(10,30,  'Día Mundial del Marketing',     'ventas_marketing',   'internacional', 'medio', 'Profesión y disciplina del marketing.'),
-- innovacion_tecnologia
(2, 11,  'Día Internacional de Internet Seguro','innovacion_tecnologia','internacional','medio','Uso seguro y responsable de internet.'),
(5, 17,  'Día Mundial de Internet',       'innovacion_tecnologia','internacional', 'medio', 'Sociedad de la información.'),
(9, 13,  'Día del Programador',           'innovacion_tecnologia','internacional', 'medio', '256º día del año (12 en bisiestos).'),
-- rrhh_equipo
(3, 8,   'Día Internacional de la Mujer Trabajadora','rrhh_equipo','internacional','alto','Igualdad y mujer en el trabajo.'),
(4, 28,  'Día Mundial de la Seguridad y Salud en el Trabajo','rrhh_equipo','internacional','medio','Prevención de riesgos laborales.'),
(5, 1,   'Día del Trabajo',               'rrhh_equipo',        'internacional', 'alto',  'Día internacional de los trabajadores.'),
(10,10,  'Día Mundial de la Salud Mental','rrhh_equipo',        'internacional', 'medio', 'Bienestar y salud mental, también en el trabajo.'),
-- sostenibilidad_empresa
(4, 22,  'Día de la Tierra',              'sostenibilidad_empresa','internacional','alto', 'Concienciación medioambiental.'),
(5, 17,  'Día Mundial del Reciclaje',     'sostenibilidad_empresa','internacional','medio','Reciclaje y economía circular.'),
(6, 5,   'Día Mundial del Medio Ambiente','sostenibilidad_empresa','internacional','alto', 'Sostenibilidad y medio ambiente.'),
-- educacion_formacion
(4, 23,  'Día Mundial del Libro',         'educacion_formacion','internacional', 'medio', 'Lectura, cultura y conocimiento.'),
(9, 8,   'Día Internacional de la Alfabetización','educacion_formacion','internacional','medio','Alfabetización y educación.'),
-- industria_emprendimiento
(4, 16,  'Día Internacional del Emprendedor','industria_emprendimiento','internacional','medio','Emprendimiento e iniciativa.'),
(6, 27,  'Día Internacional de la MIPYME (ONU)','industria_emprendimiento','internacional','medio','Micro, pequeñas y medianas empresas.'),
(11,19,  'Día Internacional del Emprendimiento Femenino','industria_emprendimiento','internacional','medio','Mujeres emprendedoras.');

-- 2) FECHAS DINÁMICAS (puntuales por año: 2026-2028) ---------------------------
INSERT INTO public.dias_clave (mes, dia, nombre, categoria, ambito, relevancia, descripcion, recurrente, ano_especifico) VALUES
-- Día de la Madre (1er domingo de mayo, España)
(5, 3,  'Día de la Madre (España)', 'fechas_comerciales', 'espana',        'alto', 'Primer domingo de mayo.', false, 2026),
(5, 2,  'Día de la Madre (España)', 'fechas_comerciales', 'espana',        'alto', 'Primer domingo de mayo.', false, 2027),
(5, 7,  'Día de la Madre (España)', 'fechas_comerciales', 'espana',        'alto', 'Primer domingo de mayo.', false, 2028),
-- Black Friday (último viernes de noviembre)
(11,27, 'Black Friday',  'fechas_comerciales', 'internacional', 'alto', 'Último viernes de noviembre.', false, 2026),
(11,26, 'Black Friday',  'fechas_comerciales', 'internacional', 'alto', 'Último viernes de noviembre.', false, 2027),
(11,24, 'Black Friday',  'fechas_comerciales', 'internacional', 'alto', 'Último viernes de noviembre.', false, 2028),
-- Cyber Monday (lunes siguiente a Black Friday)
(11,30, 'Cyber Monday',  'fechas_comerciales', 'internacional', 'alto', 'Lunes posterior a Black Friday.', false, 2026),
(11,29, 'Cyber Monday',  'fechas_comerciales', 'internacional', 'alto', 'Lunes posterior a Black Friday.', false, 2027),
(11,27, 'Cyber Monday',  'fechas_comerciales', 'internacional', 'alto', 'Lunes posterior a Black Friday.', false, 2028),
-- Hora del Planeta (último sábado de marzo)
(3, 28, 'Hora del Planeta', 'sostenibilidad_empresa', 'internacional', 'medio', 'Último sábado de marzo.', false, 2026),
(3, 27, 'Hora del Planeta', 'sostenibilidad_empresa', 'internacional', 'medio', 'Último sábado de marzo.', false, 2027),
(3, 25, 'Hora del Planeta', 'sostenibilidad_empresa', 'internacional', 'medio', 'Último sábado de marzo.', false, 2028);

-- NOTA: recuerda re-sembrar las fechas dinámicas al acercarse 2029.
