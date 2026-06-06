import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Política de Privacidad — o2Wave" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad">
      <p>
        En o2Wave nos tomamos en serio la protección de sus datos personales. Esta política explica
        qué datos recogemos, con qué finalidad, en qué base legal nos apoyamos, con quién los
        compartimos y qué derechos tiene usted sobre ellos.
      </p>

      <h2>1. Quiénes somos</h2>
      <p>El responsable del tratamiento de sus datos es:</p>
      <ul>
        <li><strong>Titular:</strong> Asociación Generación o2</li>
        <li><strong>NIF:</strong> G67418350</li>
        <li><strong>Dirección:</strong> C/ Encuny 7, piso 10 puerta 8, 08038 Barcelona, España</li>
        <li><strong>Correo de contacto:</strong> <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a></li>
      </ul>

      <h2>2. Qué datos recogemos</h2>
      <h3>2.1. Datos que usted nos facilita</h3>
      <ul>
        <li>Correo electrónico y contraseña (almacenada cifrada, nunca en texto plano).</li>
        <li>Tipo de entidad (ONG pequeña, ONG mediana o empresa).</li>
        <li>NIF o CIF de la entidad (en el caso de ONGs).</li>
        <li>Nombre de la entidad.</li>
        <li>Documento de verificación de la entidad (PDF, JPG o PNG), en el caso de ONGs.</li>
      </ul>
      <h3>2.2. Datos generados durante el uso</h3>
      <ul>
        <li>URL de su página web y datos extraídos de ella mediante análisis automático (sector, misión, público objetivo, colores de marca, estilo, etc.).</li>
        <li>Posts generados con el servicio (textos e imágenes).</li>
        <li>Preferencias de comunicación y configuración de la cuenta.</li>
      </ul>
      <h3>2.3. Datos técnicos</h3>
      <ul>
        <li>Cookies de sesión necesarias para la autenticación.</li>
        <li>Registros técnicos (dirección IP, agente de usuario) generados por nuestro proveedor de alojamiento.</li>
      </ul>

      <h2>3. Para qué usamos sus datos</h2>
      <ul>
        <li>Prestarle el servicio y permitir el acceso a su cuenta.</li>
        <li>Generar contenido para redes sociales adaptado a su entidad.</li>
        <li>Verificar la condición de entidad sin ánimo de lucro (en el caso de ONGs).</li>
        <li>Gestionar suscripciones y pagos (cuando esta funcionalidad esté disponible).</li>
        <li>Mejorar el servicio de forma interna, utilizando únicamente datos anonimizados y agregados. No utilizamos sus datos ni su contenido para entrenar modelos de inteligencia artificial propios.</li>
        <li>Cumplir con nuestras obligaciones legales y fiscales.</li>
      </ul>

      <h2>4. Base legal de cada finalidad</h2>
      <ul>
        <li><strong>Ejecución del contrato:</strong> la prestación del servicio, la generación de contenido y la gestión de su cuenta y suscripción.</li>
        <li><strong>Consentimiento:</strong> otorgado en el momento del registro para el tratamiento descrito en esta política.</li>
        <li><strong>Obligación legal:</strong> la conservación de datos fiscales durante los plazos exigidos por la normativa.</li>
        <li><strong>Interés legítimo:</strong> la mejora interna del servicio mediante datos anonimizados y agregados, y la seguridad de la plataforma.</li>
      </ul>

      <h2>5. Con quién compartimos sus datos</h2>
      <p>
        No vendemos sus datos. Los compartimos únicamente con los proveedores que los tratan por cuenta
        nuestra (encargados del tratamiento) para que el servicio funcione:
      </p>
      <ul>
        <li><strong>Supabase</strong> — base de datos, autenticación y almacenamiento. Servidores en eu-central-1 (Alemania, dentro de la UE).</li>
        <li><strong>Vercel</strong> — alojamiento de la aplicación. EE. UU., con Cláusulas Contractuales Tipo (SCC).</li>
        <li><strong>Anthropic</strong> — API de inteligencia artificial para la generación de texto. EE. UU., con SCC.</li>
        <li><strong>Replicate</strong> — generación de imágenes. EE. UU., con SCC.</li>
        <li><strong>Resend</strong> — envío de correos transaccionales. EE. UU., con SCC.</li>
        <li><strong>Stripe</strong> — pasarela de pago (próximamente). EE. UU., con SCC.</li>
      </ul>
      <p>
        Para los proveedores ubicados fuera de la Unión Europea, las transferencias internacionales se
        amparan en Cláusulas Contractuales Tipo aprobadas por la Comisión Europea.
      </p>

      <h2>6. Cuánto tiempo conservamos sus datos</h2>
      <ul>
        <li>Conservamos sus datos mientras su cuenta esté activa.</li>
        <li>Si elimina su cuenta, sus datos personales se borran de forma inmediata.</li>
        <li>Los datos fiscales se conservan durante 6 años, según exige la normativa.</li>
      </ul>

      <h2>7. Sus derechos</h2>
      <p>Usted puede ejercer en cualquier momento los siguientes derechos:</p>
      <ul>
        <li>Acceso a sus datos.</li>
        <li>Rectificación de datos inexactos.</li>
        <li>Supresión (derecho al olvido).</li>
        <li>Limitación del tratamiento.</li>
        <li>Portabilidad de sus datos.</li>
        <li>Oposición al tratamiento.</li>
      </ul>
      <p>
        Para ejercerlos, escriba a <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
        Responderemos en los plazos previstos por la normativa.
      </p>

      <h2>8. Seguridad</h2>
      <ul>
        <li>Todas las comunicaciones se cifran mediante HTTPS.</li>
        <li>Las contraseñas se almacenan con funciones de hash gestionadas por nuestro proveedor de autenticación (Supabase).</li>
        <li>Los documentos de verificación de entidades se guardan en un almacenamiento privado, accesible solo por el propio usuario y por nuestro personal autorizado.</li>
      </ul>

      <h2>9. Menores de edad</h2>
      <p>
        El uso de o2Wave está prohibido a menores de 18 años. Si detectamos que un menor se ha
        registrado, eliminaremos su cuenta de forma inmediata.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Nos reservamos el derecho a actualizar esta política. Si introducimos cambios sustanciales, se
        lo notificaremos por correo electrónico.
      </p>

      <h2>11. Reclamaciones ante la autoridad de control</h2>
      <p>
        Si considera que sus derechos no se han respetado, puede presentar una reclamación ante la
        Agencia Española de Protección de Datos (AEPD), a través de <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>.
      </p>
    </LegalPage>
  );
}
