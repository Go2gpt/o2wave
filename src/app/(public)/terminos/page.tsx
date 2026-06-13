import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Términos y Condiciones — o2Wave" };

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones de uso de o2Wave">
      <p>
        Los presentes Términos y condiciones (en adelante, los &laquo;Términos&raquo;) regulan el acceso y uso
        de la plataforma o2Wave, accesible a través de <a href="https://www.o2wave.app">https://www.o2wave.app</a>{" "}
        (en adelante, el &laquo;Servicio&raquo;), titularidad de la <strong>Asociación Generación o2</strong>{" "}
        (en adelante, &laquo;Generación o2&raquo;, &laquo;nosotros&raquo; o &laquo;el Titular&raquo;), cuyos datos
        identificativos figuran en el apartado 1.
      </p>
      <p>
        El uso del Servicio implica la aceptación plena y sin reservas de estos Términos. Si no estás de
        acuerdo con alguno de ellos, no utilices el Servicio.
      </p>

      <h2>1. Información general</h2>
      <p>
        Los presentes Términos regulan el acceso y uso de la plataforma o2Wave. El Titular del Servicio es la
        Asociación Generación o2, con NIF G67418350, domicilio en Carrer Encuny 7, piso 10, puerta 8, 08038
        Barcelona, España, y email de contacto <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
      </p>

      <h2>2. Objeto del Servicio</h2>
      <p>
        o2Wave es una herramienta de software como servicio (SaaS) que asiste a organizaciones sin ánimo de
        lucro (ONGs), pequeñas y medianas empresas (PYMEs) y profesionales en la generación de contenido para
        redes sociales mediante inteligencia artificial. El Servicio incluye, entre otras funcionalidades:
      </p>
      <ul>
        <li>Generación automatizada de textos, imágenes y guiones para Instagram, Facebook y TikTok.</li>
        <li>Calendario editorial de días clave.</li>
        <li>Generación semanal automática de un pack de contenido (en planes que lo incluyan).</li>
        <li>Estadísticas de actividad y herramientas de gestión del perfil de marca.</li>
      </ul>

      <h2>3. Registro y cuenta de usuario</h2>
      <p>
        3.1. Para utilizar el Servicio es necesario registrarse y crear una cuenta proporcionando un correo
        electrónico válido, una contraseña, el NIF/CIF de la entidad y completar el proceso de verificación.
      </p>
      <p>3.2. El usuario declara y garantiza:</p>
      <ul>
        <li>Ser mayor de 18 años.</li>
        <li>Tener capacidad legal para contratar.</li>
        <li>Que los datos facilitados son veraces, exactos y se mantendrán actualizados.</li>
        <li>Actuar en nombre de la organización a la que representa, con autoridad suficiente para vincularla.</li>
      </ul>
      <p>
        3.3. El usuario es responsable de mantener la confidencialidad de sus credenciales y de cualquier
        actividad realizada desde su cuenta. Cualquier acceso no autorizado debe ser notificado de inmediato a{" "}
        <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
      </p>
      <p>
        3.4. Generación o2 podrá suspender o cancelar cuentas que incumplan estos Términos o que se utilicen
        para finalidades fraudulentas o ilícitas.
      </p>

      <h2>4. Planes, precios y pagos</h2>
      <p>
        4.1. El Servicio se ofrece bajo distintos planes (gratuito y de pago) cuyas características, límites de
        uso y precios están publicados en <Link href="/plans">la página de planes</Link>. Los precios incluyen
        el IVA correspondiente.
      </p>
      <p>
        4.2. La contratación de planes de pago se realiza mediante suscripción periódica (mensual o anual). Los
        pagos se procesan a través de <strong>Stripe Payments Europe, Ltd.</strong>, proveedor de pagos
        certificado PCI-DSS. Generación o2 no almacena ni accede en ningún momento a los datos de tarjeta
        bancaria del usuario.
      </p>
      <p>
        4.3. La suscripción se renueva automáticamente al final de cada periodo facturado salvo que el usuario
        la cancele con anterioridad desde el portal de gestión de su cuenta o desde la sección &laquo;Mi
        suscripción&raquo; en su perfil.
      </p>
      <p>4.4. <strong>Cancelación y reembolsos:</strong></p>
      <ul>
        <li>El usuario puede cancelar su suscripción en cualquier momento, sin penalización.</li>
        <li>Tras la cancelación, el Servicio continuará activo hasta la finalización del periodo facturado en curso.</li>
        <li>No se efectuarán reembolsos parciales por el tiempo no consumido del periodo facturado.</li>
        <li>En caso de defectos graves del Servicio no resueltos en plazo razonable, el usuario podrá solicitar un reembolso proporcional escribiendo a <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.</li>
      </ul>
      <p>
        4.5. <strong>Plan gratuito:</strong> los usuarios del plan gratuito disponen de un número limitado de
        generaciones mensuales. Una vez alcanzado el límite, la generación de nuevo contenido queda bloqueada
        hasta el siguiente ciclo o hasta que el usuario contrate un plan superior. Las condiciones de acceso al
        plan gratuito se detallan en el apartado 5.
      </p>
      <p>
        4.6. <strong>Impago:</strong> si una renovación de pago falla y no se regulariza en un plazo de 7 días,
        la cuenta pasará a estado suspendido y se bloqueará la generación de nuevo contenido. El usuario podrá
        restablecer el servicio actualizando su método de pago.
      </p>

      <h2 id="plan-gratuito">5. Plan gratuito para ONGs pequeñas</h2>
      <p>
        o2Wave ofrece un plan gratuito permanente diseñado para entidades sin ánimo de lucro de pequeña
        dimensión. Para acogerse al plan gratuito, el usuario debe cumplir todos los siguientes requisitos:
      </p>
      <h3>5.1. Naturaleza jurídica de la entidad</h3>
      <p>
        La cuenta debe corresponder a una entidad sin ánimo de lucro legalmente constituida en España o en otro
        país, identificada con un CIF que empiece por G (asociaciones), R (religiosas), V (fundaciones,
        agrupaciones sin personalidad jurídica con NIF), N (entidades extranjeras), o equivalente extranjero.
        Quedan excluidas las sociedades mercantiles (S.L., S.A., S.L.U., S.C., autónomos personas físicas),
        aunque su actividad tenga componente social.
      </p>
      <h3>5.2. Presupuesto anual</h3>
      <p>
        La entidad debe declarar un presupuesto anual de funcionamiento inferior a 50.000 € (cincuenta mil
        euros). Este presupuesto incluye la totalidad de ingresos anuales (cuotas, subvenciones, donaciones,
        prestaciones de servicios, etc.) según las cuentas anuales más recientes presentadas en el registro
        correspondiente.
      </p>
      <h3>5.3. Estructura del equipo</h3>
      <p>
        La entidad debe operar principalmente con personal voluntario. Se admiten como máximo un (1) trabajador
        remunerado a tiempo completo o equivalente en jornada parcial. No se contabilizan: voluntarios,
        becarios sin retribución, personal subcontratado puntualmente para acciones concretas, ni miembros de
        junta directiva no retribuidos.
      </p>
      <h3>5.4. Servicios incluidos en el plan gratuito</h3>
      <p>El plan gratuito incluye:</p>
      <ul>
        <li>Generación de hasta diez (10) publicaciones al mes con inteligencia artificial (texto + imagen). El contador se reinicia el día 1 de cada mes natural.</li>
        <li>Publicación en redes sociales Instagram y Facebook.</li>
        <li>Acceso al calendario de días clave y a la preselección de categorías según el tipo de entidad.</li>
        <li>Estadísticas básicas de actividad.</li>
      </ul>
      <h3>5.5. Servicios NO incluidos en el plan gratuito</h3>
      <p>El plan gratuito NO incluye los siguientes servicios, que requieren suscripción de pago:</p>
      <ul>
        <li>Publicación en TikTok.</li>
        <li>Pack semanal automático de contenido.</li>
        <li>Estadísticas avanzadas (analítica de evolución, comparativas, etc.).</li>
        <li>Generación ilimitada de publicaciones (por encima del cap mensual).</li>
      </ul>
      <h3>5.6. Veracidad de la declaración y consecuencias</h3>
      <p>
        El usuario es responsable de la veracidad de los datos declarados al registrarse y acogerse al plan
        gratuito. Generación o2 se reserva el derecho de:
      </p>
      <ul>
        <li>a) Solicitar al usuario documentación acreditativa del cumplimiento de los requisitos (estatutos, cuentas anuales, certificado del registro de asociaciones, etc.) en cualquier momento.</li>
        <li>b) Reclasificar la cuenta al plan &laquo;ONG mediana&raquo; (de pago) si comprueba que la entidad excede los umbrales establecidos, notificándolo al usuario con un mínimo de quince (15) días de antelación.</li>
        <li>c) Suspender el plan gratuito si se detecta falsedad en la declaración inicial. En tal caso, el usuario podrá continuar usando el Servicio contratando un plan de pago.</li>
      </ul>
      <h3>5.7. Cambios en las condiciones del plan gratuito</h3>
      <p>
        Generación o2 podrá modificar los límites, los servicios incluidos o los criterios de acceso al plan
        gratuito, notificándolo al usuario con un mínimo de treinta (30) días de antelación. En caso de no
        aceptación, el usuario podrá darse de baja sin penalización.
      </p>
      <h3>5.8. Códigos promocionales</h3>
      <p>
        Las entidades que no cumplan los criterios del plan gratuito permanente pueden, no obstante, acogerse a
        códigos promocionales (campañas de lanzamiento, descuentos puntuales, etc.) ofrecidos por Generación o2.
        Estos códigos se rigen por sus propias condiciones, indicadas en el momento del canje.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>
        6.1. El usuario se compromete a utilizar el Servicio exclusivamente para fines lícitos y conforme a la
        moral, el orden público y las buenas costumbres. Queda prohibido, entre otros:
      </p>
      <ul>
        <li>Generar contenido ilegal, discriminatorio, violento, sexualmente explícito que involucre a menores, o que infrinja derechos de terceros.</li>
        <li>Suplantar la identidad de otras personas u organizaciones.</li>
        <li>Utilizar el Servicio para spam, fraude, phishing o cualquier finalidad maliciosa.</li>
        <li>Realizar ingeniería inversa, descompilación o intentos de obtener el código fuente.</li>
        <li>Acceder a cuentas o sistemas ajenos sin autorización.</li>
        <li>Utilizar bots o scripts automatizados para abusar de los límites del Servicio.</li>
      </ul>
      <p>
        6.2. Generación o2 podrá suspender o cancelar cualquier cuenta que incumpla las anteriores normas sin
        derecho a reembolso.
      </p>

      <h2>7. Contenido generado por inteligencia artificial</h2>
      <p>
        7.1. El contenido (textos, imágenes, guiones) generado por o2Wave es producido por modelos de
        inteligencia artificial de terceros (incluyendo, entre otros, Anthropic y Replicate). Generación o2 no
        garantiza la exactitud, originalidad ni ausencia de errores de dicho contenido.
      </p>
      <p>
        7.2. El usuario es <strong>el único responsable</strong> del contenido que publique, comparta o
        distribuya, debiendo revisarlo antes de su publicación.
      </p>
      <p>
        7.3. La titularidad y derechos de uso del contenido generado corresponden al usuario, sin perjuicio de
        las limitaciones impuestas por los términos de uso de los modelos de IA subyacentes y de la legislación
        aplicable en materia de propiedad intelectual.
      </p>
      <p>
        7.4. <strong>Tecnología.</strong> Generación de texto con modelos de Anthropic (Claude). Generación de
        imágenes con Replicate. Almacenamiento y autenticación con Supabase. Pagos procesados por Stripe.
      </p>

      <h2>8. Propiedad intelectual del Servicio</h2>
      <p>
        8.1. Todos los derechos sobre el Servicio, su software, diseño, marca, logos, dominios y demás
        elementos identificativos son propiedad exclusiva de Generación o2 o sus licenciantes.
      </p>
      <p>
        8.2. La marca <strong>&laquo;o2Wave&raquo;</strong> y el logotipo asociado son signos distintivos de
        Generación o2.
      </p>
      <p>
        8.3. Queda prohibida la reproducción, distribución, comunicación pública o transformación del Servicio
        sin autorización expresa.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        9.1. El Servicio se presta &laquo;tal cual&raquo; y &laquo;según disponibilidad&raquo;, sin más
        garantías que las legalmente exigibles.
      </p>
      <p>9.2. Generación o2 no será responsable de los daños o perjuicios derivados de:</p>
      <ul>
        <li>La indisponibilidad temporal del Servicio por causas técnicas, mantenimiento o fuerza mayor.</li>
        <li>El uso indebido del Servicio por parte del usuario.</li>
        <li>La exactitud, calidad o licitud del contenido generado por la IA.</li>
        <li>Pérdidas comerciales, lucro cesante o daños indirectos.</li>
      </ul>
      <p>
        9.3. En todo caso, la responsabilidad máxima de Generación o2 frente al usuario quedará limitada al
        importe efectivamente abonado por el usuario en los doce (12) meses anteriores al hecho que origine la
        responsabilidad.
      </p>

      <h2>10. Modificaciones del Servicio</h2>
      <p>
        10.1. Generación o2 se reserva el derecho a modificar, ampliar o suspender total o parcialmente el
        Servicio, así como a introducir nuevas funcionalidades, en cualquier momento.
      </p>
      <p>
        10.2. Las modificaciones sustanciales se comunicarán al usuario con una antelación mínima de 15 días por
        correo electrónico.
      </p>

      <h2>11. Protección de datos</h2>
      <p>
        El tratamiento de los datos personales del usuario se rige por la{" "}
        <Link href="/privacidad">Política de privacidad</Link>, que forma parte integrante de estos Términos.
      </p>

      <h2>12. Comunicaciones electrónicas</h2>
      <p>
        12.1. Al utilizar el Servicio, el usuario acepta recibir las comunicaciones electrónicas necesarias
        para la prestación del Servicio (confirmaciones, notificaciones técnicas, avisos de facturación, etc.).
      </p>
      <p>
        12.2. El usuario podrá darse de baja en cualquier momento de las comunicaciones comerciales no
        esenciales desde la configuración de su cuenta o escribiendo a{" "}
        <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
      </p>

      <h2>13. Modificación de los Términos</h2>
      <p>
        13.1. Generación o2 podrá modificar estos Términos en cualquier momento. Las modificaciones entrarán en
        vigor a los 15 días naturales de su publicación.
      </p>
      <p>
        13.2. La continuación en el uso del Servicio tras dicho plazo supondrá la aceptación de los nuevos
        Términos. Si el usuario no acepta los cambios, podrá cancelar su cuenta sin penalización.
      </p>

      <h2>14. Ley aplicable y jurisdicción</h2>
      <p>14.1. Estos Términos se rigen por la legislación española.</p>
      <p>
        14.2. Para la resolución de cualquier controversia derivada de los presentes Términos, las partes se
        someten expresamente a los Juzgados y Tribunales de Barcelona, con renuncia expresa a cualquier otro
        fuero que pudiera corresponderles, salvo aquellos en los que la legislación de consumo imponga un fuero
        distinto al usuario que tenga la consideración de consumidor.
      </p>

      <h2>15. Contacto</h2>
      <p>Para cualquier consulta relacionada con estos Términos puedes escribirnos a:</p>
      <p>
        <strong>Asociación Generación o2</strong><br />
        Email: <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a><br />
        Dirección: Carrer Encuny 7, piso 10, puerta 8, 08038 Barcelona, España
      </p>
    </LegalPage>
  );
}
