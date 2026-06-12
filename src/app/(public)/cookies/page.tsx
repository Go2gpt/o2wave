import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Política de Cookies — o2Wave" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies de o2Wave">
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando visitas un sitio
        web. Sirven para que el sitio te reconozca en visitas posteriores, recuerde tus preferencias y funcione
        correctamente.
      </p>

      <h2>2. ¿Qué cookies usa o2Wave?</h2>
      <p>
        o2Wave utiliza <strong>exclusivamente cookies técnicas estrictamente necesarias</strong> para el
        funcionamiento del Servicio. No utilizamos cookies analíticas, publicitarias ni de terceros con fines
        de seguimiento.
      </p>
      <p>
        Estas cookies técnicas están <strong>exentas del deber de consentimiento</strong> según el artículo
        22.2 de la Ley 34/2002 (LSSI-CE) y las directrices de la Agencia Española de Protección de Datos
        (AEPD), porque son imprescindibles para prestar un servicio expresamente solicitado por el usuario.
      </p>

      <h2>3. Listado de cookies</h2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duración</th></tr>
        </thead>
        <tbody>
          <tr><td><code>sb-access-token</code></td><td>Supabase</td><td>Mantener la sesión del usuario autenticado</td><td>1 hora (se renueva)</td></tr>
          <tr><td><code>sb-refresh-token</code></td><td>Supabase</td><td>Renovar la sesión sin requerir nueva autenticación</td><td>30 días</td></tr>
          <tr><td>Cookies de sesión de Vercel</td><td>Vercel</td><td>Funcionamiento de la plataforma de alojamiento</td><td>Sesión</td></tr>
        </tbody>
      </table>
      <p>
        Si la lista de cookies cambia en el futuro, actualizaremos esta página con la antelación
        correspondiente.
      </p>

      <h2>4. ¿Cómo gestionar las cookies?</h2>
      <p>
        Aunque las cookies técnicas no requieren consentimiento, puedes gestionar o eliminar las cookies desde
        la configuración de tu navegador. Te dejamos los enlaces a las instrucciones oficiales:
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
      </ul>
      <p>
        Ten en cuenta que si deshabilitas las cookies técnicas el Servicio puede dejar de funcionar
        correctamente, especialmente la autenticación: no podrás iniciar sesión.
      </p>

      <h2>5. Cookies en terceros enlazados</h2>
      <p>
        Si desde el Servicio sigues enlaces a sitios de terceros (por ejemplo, las páginas de Stripe para
        gestionar tu suscripción), serás redirigido a sitios que tienen sus propias políticas de cookies y
        privacidad sobre las que Generación o2 no tiene control. Te recomendamos revisar dichas políticas.
      </p>

      <h2>6. Modificaciones de esta Política</h2>
      <p>
        Esta Política de cookies puede actualizarse para reflejar cambios en el Servicio o en la normativa.
        Cualquier cambio se publicará en esta misma página con la fecha de actualización correspondiente.
      </p>

      <h2>7. Contacto</h2>
      <p>Para cualquier consulta sobre el uso de cookies:</p>
      <p>
        <strong>Asociación Generación o2</strong><br />
        Email: <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a><br />
        Dirección: Carrer Encuny 7, piso 10, puerta 8, 08038 Barcelona, España
      </p>
      <p>
        Consulta también nuestra <Link href="/privacidad">Política de privacidad</Link> y los{" "}
        <Link href="/terminos">Términos y condiciones</Link>.
      </p>
    </LegalPage>
  );
}
