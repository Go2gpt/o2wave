import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Política de Cookies — o2Wave" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies">
      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies son pequeños archivos que un sitio web guarda en su navegador. Sirven, entre otras
        cosas, para mantener la sesión iniciada, recordar preferencias o medir el uso del sitio.
      </p>

      <h2>2. Qué cookies usa o2Wave</h2>
      <p>
        En este momento o2Wave utiliza únicamente cookies técnicas estrictamente necesarias para su
        funcionamiento (autenticación):
      </p>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Proveedor</th>
            <th>Finalidad</th>
            <th>Duración</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-&lt;proyecto&gt;-auth-token</td>
            <td>Supabase</td>
            <td>Mantener su sesión iniciada de forma segura.</td>
            <td>De sesión (se elimina al cerrar el navegador).</td>
            <td>Técnica necesaria</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Tipos de cookies (informativo)</h2>
      <ul>
        <li><strong>Técnicas:</strong> imprescindibles para que el sitio funcione.</li>
        <li><strong>De preferencias:</strong> recuerdan opciones del usuario.</li>
        <li><strong>Analíticas:</strong> miden el uso del sitio de forma estadística.</li>
        <li><strong>Publicitarias:</strong> muestran anuncios basados en la navegación.</li>
      </ul>
      <p>o2Wave solo utiliza, por ahora, cookies del primer tipo.</p>

      <h2>4. Consentimiento</h2>
      <p>
        Las cookies que utilizamos son estrictamente necesarias para que la aplicación funcione
        (autenticación). Conforme al RGPD y a la LSSI, las cookies técnicas necesarias no requieren
        consentimiento previo. Por ese motivo este sitio no muestra un banner de «Aceptar/Rechazar»,
        sino únicamente un aviso informativo.
      </p>

      <h2>5. Cómo gestionar las cookies en su navegador</h2>
      <p>Puede revisar o eliminar las cookies desde la configuración de su navegador:</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
      </ul>

      <h2>6. Cambios en esta política</h2>
      <p>
        Si en el futuro incorporamos cookies analíticas o de seguimiento, actualizaremos esta política e
        implementaremos un mecanismo de consentimiento adecuado.
      </p>
    </LegalPage>
  );
}
