import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Eliminar tus datos — o2Wave" };

// Página pública de instrucciones de borrado de datos.
// Requerida por Meta (App Review) como "Data Deletion Instructions URL":
// https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
export default function EliminarDatosPage() {
  return (
    <LegalPage title="Cómo eliminar tus datos de o2Wave">
      <p>
        En o2Wave puedes eliminar tus datos en cualquier momento y de forma gratuita. Aquí te explicamos las
        distintas opciones según lo que quieras borrar.
      </p>

      <h2>1. Eliminar toda tu cuenta y tus datos</h2>
      <p>Es la opción más completa: borra tu perfil, tu contenido generado y todos tus datos asociados.</p>
      <ul>
        <li>Inicia sesión en <a href="https://o2wave.app" target="_blank" rel="noopener noreferrer">o2wave.app</a>.</li>
        <li>Ve a <strong>Perfil</strong>.</li>
        <li>Pulsa <strong>«Eliminar cuenta»</strong> (al final de la página).</li>
        <li>Confirma escribiendo <strong>ELIMINAR</strong>. La acción es inmediata e irreversible.</li>
      </ul>
      <p>
        Al eliminar tu cuenta se borran tu perfil, tu identidad de marca, tus categorías, los posts y packs que
        hayas generado, y <strong>cualquier conexión con tus cuentas de Instagram o Facebook</strong>, incluidos
        los tokens de acceso guardados. Conservamos únicamente los datos que la ley nos obliga a mantener
        (facturas, durante 6 años por obligaciones fiscales), tal y como se detalla en nuestra{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>2. Desconectar tus cuentas de Instagram / Facebook</h2>
      <p>
        Si solo quieres que o2Wave deje de tener acceso a tus redes sociales (sin borrar tu cuenta de o2Wave):
      </p>
      <ul>
        <li>Ve a <strong>Perfil → Cuentas conectadas</strong> y pulsa <strong>«Desconectar»</strong> en la cuenta que quieras. Esto elimina el token de acceso de esa cuenta de nuestros servidores.</li>
        <li>
          Adicionalmente, puedes revocar el acceso desde la propia configuración de Facebook:{" "}
          <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer">
            Configuración de Facebook → Integraciones empresariales
          </a>
          , selecciona <strong>o2Wave</strong> y pulsa <strong>Eliminar</strong>.
        </li>
      </ul>

      <h2>3. Solicitar el borrado por correo electrónico</h2>
      <p>
        Si no puedes acceder a tu cuenta o prefieres que lo gestionemos nosotros, escríbenos a{" "}
        <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a> desde el correo con el que te
        registraste, indicando que deseas eliminar tus datos. Atenderemos tu solicitud en un plazo máximo de{" "}
        <strong>30 días</strong> y te confirmaremos por escrito cuando se haya completado.
      </p>

      <h2>Responsable del tratamiento</h2>
      <p>
        <strong>Asociación Generación o2</strong> — NIF: G67418350<br />
        Email: <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>
      </p>
      <p>
        Para más información sobre qué datos tratamos y durante cuánto tiempo, consulta nuestra{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </LegalPage>
  );
}
