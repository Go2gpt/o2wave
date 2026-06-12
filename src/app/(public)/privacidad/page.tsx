import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Política de Privacidad — o2Wave" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad de o2Wave">
      <p>
        En Generación o2 nos tomamos en serio tu privacidad. Esta Política de privacidad explica qué datos
        personales recogemos, con qué finalidad, durante cuánto tiempo y con quién los compartimos, conforme al
        Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        <strong>Asociación Generación o2</strong><br />
        NIF: G67418350<br />
        Domicilio: Carrer Encuny 7, piso 10, puerta 8, 08038 Barcelona, España<br />
        Email de contacto: <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>
      </p>
      <p>
        Si tienes cualquier duda sobre el tratamiento de tus datos, puedes escribirnos a la dirección de email
        indicada.
      </p>

      <h2>2. Datos que recogemos</h2>
      <h3>2.1. Datos que nos facilitas directamente</h3>
      <ul>
        <li><strong>Datos de identificación y contacto</strong>: nombre o razón social de la entidad, NIF/CIF, correo electrónico, contraseña (almacenada cifrada).</li>
        <li><strong>Datos de la organización</strong>: misión, valores, público objetivo, servicios, hashtags habituales, idioma principal, geografía, logros y otra información sobre tu actividad que decidas compartir para configurar tu perfil.</li>
        <li><strong>Contenido generado</strong>: los textos, imágenes y publicaciones que produces utilizando el Servicio.</li>
        <li><strong>Datos económicos</strong>: información necesaria para la facturación. Los datos de tarjeta bancaria se gestionan directamente por Stripe y <strong>no son almacenados ni accedidos por Generación o2</strong> en ningún momento.</li>
      </ul>
      <h3>2.2. Datos recogidos automáticamente</h3>
      <ul>
        <li><strong>Datos técnicos</strong>: dirección IP, identificador de sesión, tipo de navegador y sistema operativo, fecha y hora de acceso.</li>
        <li><strong>Datos de uso</strong>: páginas visitadas dentro del Servicio, acciones realizadas, número de generaciones consumidas.</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <p>Tratamos tus datos para las siguientes finalidades:</p>
      <table>
        <thead>
          <tr><th>Finalidad</th><th>Base legal</th></tr>
        </thead>
        <tbody>
          <tr><td>Prestación del Servicio (creación de cuenta, generación de contenido, gestión de la suscripción)</td><td>Ejecución del contrato</td></tr>
          <tr><td>Facturación y cumplimiento de obligaciones fiscales</td><td>Cumplimiento de obligación legal</td></tr>
          <tr><td>Envío de comunicaciones transaccionales (confirmaciones, avisos de pago, generación del pack semanal, recuperación de contraseña)</td><td>Ejecución del contrato</td></tr>
          <tr><td>Soporte al usuario</td><td>Ejecución del contrato</td></tr>
          <tr><td>Prevención de fraude y uso indebido del Servicio</td><td>Interés legítimo</td></tr>
          <tr><td>Mejora del Servicio (análisis estadístico agregado y anónimo)</td><td>Interés legítimo</td></tr>
          <tr><td>Envío de comunicaciones comerciales sobre el propio Servicio</td><td>Interés legítimo, con derecho de oposición</td></tr>
        </tbody>
      </table>

      <h2>4. Plazos de conservación</h2>
      <ul>
        <li><strong>Datos de la cuenta</strong>: mientras la cuenta esté activa. Tras la baja, se conservan durante 6 años por obligaciones contables y fiscales (Ley General Tributaria) y, transcurrido ese plazo, se anonimizan o eliminan.</li>
        <li><strong>Datos económicos y facturas</strong>: 6 años (Ley General Tributaria).</li>
        <li><strong>Contenido generado</strong>: mientras la cuenta esté activa. Puedes eliminar contenido individualmente en cualquier momento desde el Servicio.</li>
        <li><strong>Datos técnicos y logs de acceso</strong>: 12 meses, conforme a las obligaciones de la LSSI-CE.</li>
      </ul>

      <h2>5. Destinatarios y encargados del tratamiento</h2>
      <p>
        Para prestar el Servicio nos apoyamos en proveedores tecnológicos que actúan como{" "}
        <strong>encargados del tratamiento</strong> bajo contrato y conforme al art. 28 RGPD. Estos son:
      </p>
      <table>
        <thead>
          <tr><th>Proveedor</th><th>Finalidad</th><th>Ubicación</th><th>Garantías</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Stripe Payments Europe, Ltd.</strong></td><td>Procesamiento de pagos</td><td>Irlanda</td><td>Encargado dentro del EEE</td></tr>
          <tr><td><strong>Supabase, Inc.</strong></td><td>Base de datos, autenticación, almacenamiento de archivos</td><td>EE.UU.</td><td>Cláusulas Contractuales Tipo (CCT) y Marco de Privacidad de Datos UE-EE.UU.</td></tr>
          <tr><td><strong>Vercel, Inc.</strong></td><td>Alojamiento de la aplicación</td><td>EE.UU.</td><td>Cláusulas Contractuales Tipo (CCT) y Marco de Privacidad de Datos UE-EE.UU.</td></tr>
          <tr><td><strong>Anthropic PBC</strong></td><td>Modelo de inteligencia artificial para generación de texto (Claude)</td><td>EE.UU.</td><td>Cláusulas Contractuales Tipo (CCT)</td></tr>
          <tr><td><strong>Replicate, Inc.</strong></td><td>Generación de imágenes con inteligencia artificial</td><td>EE.UU.</td><td>Cláusulas Contractuales Tipo (CCT)</td></tr>
          <tr><td><strong>Resend, Inc.</strong></td><td>Envío de correos electrónicos transaccionales</td><td>EE.UU.</td><td>Cláusulas Contractuales Tipo (CCT)</td></tr>
        </tbody>
      </table>
      <p>
        Las transferencias internacionales a EE.UU. se realizan bajo las garantías legales adecuadas: adhesión
        al <strong>Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework)</strong> o suscripción de{" "}
        <strong>Cláusulas Contractuales Tipo</strong> aprobadas por la Comisión Europea.
      </p>
      <p>No vendemos, alquilamos ni cedemos tus datos a terceros con fines comerciales.</p>

      <h2>6. Derechos del usuario</h2>
      <p>Como titular de los datos, tienes derecho a:</p>
      <ul>
        <li><strong>Acceder</strong> a tus datos personales que tratamos.</li>
        <li><strong>Rectificar</strong> los datos inexactos o incompletos.</li>
        <li><strong>Suprimir</strong> tus datos cuando ya no sean necesarios.</li>
        <li><strong>Oponerte</strong> al tratamiento basado en interés legítimo.</li>
        <li><strong>Limitar</strong> el tratamiento en ciertas circunstancias.</li>
        <li><strong>Solicitar la portabilidad</strong> de tus datos.</li>
        <li><strong>Retirar el consentimiento</strong> en cualquier momento (sin efectos retroactivos).</li>
        <li><strong>No ser objeto de decisiones automatizadas</strong> con efectos jurídicos significativos.</li>
      </ul>
      <p>
        Para ejercer estos derechos puedes escribir a{" "}
        <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a> indicando claramente el derecho que
        ejerces y adjuntando copia de un documento que acredite tu identidad. Te responderemos en el plazo
        máximo de un mes.
      </p>
      <p>
        Si consideras que el tratamiento de tus datos no se ajusta a la normativa, tienes derecho a presentar
        una reclamación ante la{" "}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>{" "}
        (www.aepd.es).
      </p>

      <h2>7. Decisiones automatizadas y perfilado</h2>
      <p>
        El Servicio utiliza modelos de inteligencia artificial para generar contenido a partir de la
        información que el usuario aporta. <strong>Estas generaciones no constituyen decisiones automatizadas
        con efectos jurídicos</strong> en el sentido del art. 22 RGPD: el usuario revisa, edita y decide
        voluntariamente qué contenido publica.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        El Servicio está dirigido a mayores de 18 años. No recogemos conscientemente datos personales de
        menores. Si detectamos una cuenta cuyo titular es menor de edad, procederemos a su cancelación
        inmediata.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: cifrado en tránsito
        (HTTPS/TLS), cifrado en reposo de las contraseñas, control de acceso por roles, copias de seguridad
        periódicas y auditoría de accesos.
      </p>
      <p>
        A pesar de las medidas implementadas, ningún sistema es 100 % invulnerable. Si detectas o sospechas una
        brecha de seguridad, notifícanoslo de inmediato a{" "}
        <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
      </p>

      <h2>10. Cookies</h2>
      <p>
        El Servicio utiliza únicamente cookies técnicas estrictamente necesarias para su funcionamiento. Más
        información en nuestra <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>11. Modificaciones de esta Política</h2>
      <p>
        Esta Política de privacidad puede actualizarse para reflejar cambios legales o en el Servicio.
        Cualquier cambio sustancial se notificará al usuario por correo electrónico con una antelación mínima
        de 15 días.
      </p>

      <h2>12. Contacto</h2>
      <p>Para cualquier consulta sobre protección de datos:</p>
      <p>
        <strong>Asociación Generación o2</strong><br />
        Email: <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a><br />
        Dirección: Carrer Encuny 7, piso 10, puerta 8, 08038 Barcelona, España
      </p>
    </LegalPage>
  );
}
