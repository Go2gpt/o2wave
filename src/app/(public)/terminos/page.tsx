import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Términos y Condiciones — o2Wave" };

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y Condiciones de Uso">
      <p>
        Estos Términos y Condiciones regulan el acceso y uso del servicio o2Wave. Al registrarse y
        utilizar el servicio, usted acepta quedar vinculado por ellos.
      </p>

      <h2>1. Quiénes somos</h2>
      <ul>
        <li><strong>Titular del servicio:</strong> Asociación Generación o2</li>
        <li><strong>NIF:</strong> G67418350</li>
        <li><strong>Dirección:</strong> C/ Encuny 7, piso 10 puerta 8, 08038 Barcelona, España</li>
        <li><strong>Contacto:</strong> <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a></li>
      </ul>

      <h2>2. Objeto del servicio</h2>
      <p>
        o2Wave es una herramienta de generación de contenido para redes sociales mediante inteligencia
        artificial, dirigida a organizaciones sin ánimo de lucro (ONGs) y a empresas. Permite generar
        textos, imágenes y guiones adaptados a la identidad de cada entidad.
      </p>

      <h2>3. Registro y cuenta</h2>
      <ul>
        <li>Para usar el servicio debe ser mayor de 18 años.</li>
        <li>Debe ser representante legítimo de la entidad (ONG o empresa) con la que se registra.</li>
        <li>Las ONGs deben superar un proceso de verificación documental para acceder a sus condiciones.</li>
        <li>Usted es responsable de la veracidad de los datos facilitados y de la confidencialidad de su contraseña.</li>
      </ul>

      <h2>4. Planes y suscripciones</h2>
      <p>
        Las condiciones económicas, cuando la funcionalidad de pago esté disponible, son las siguientes:
      </p>
      <ul>
        <li><strong>ONG pequeña:</strong> gratuito, sujeto a verificación documental.</li>
        <li><strong>ONG mediana:</strong> 9 €/mes.</li>
        <li><strong>Empresa (Early Bird):</strong> 9 €/mes para los primeros 100 usuarios; posteriormente, plan Estándar a 19 €/mes y plan Pro a 39 €/mes.</li>
      </ul>
      <p>Los precios podrán actualizarse conforme a la cláusula 10.</p>

      <h2>5. Cancelación de la suscripción</h2>
      <ul>
        <li>Puede cancelar su suscripción en cualquier momento.</li>
        <li>Mantendrá el acceso al servicio hasta el final del periodo ya pagado.</li>
        <li>No se realizan devoluciones por periodos ya abonados.</li>
        <li>Dado que el servicio digital se presta de forma inmediata, usted renuncia expresamente al derecho de desistimiento de 14 días al aceptar el inicio inmediato de la prestación, conforme a la excepción prevista para servicios digitales.</li>
      </ul>

      <h2>6. Propiedad intelectual</h2>
      <ul>
        <li>Usted es el propietario del contenido que genera con el servicio.</li>
        <li>o2Wave se reserva una licencia mínima, no exclusiva y limitada, para almacenar y mostrar dicho contenido dentro de la aplicación con el fin de prestarle el servicio.</li>
        <li>La marca o2Wave, el código, el diseño y la tecnología del servicio son propiedad de la Asociación Generación o2 y están protegidos.</li>
      </ul>

      <h2>7. Uso de la inteligencia artificial</h2>
      <ul>
        <li>El contenido se genera mediante modelos de inteligencia artificial, que pueden producir resultados erróneos, incompletos, ofensivos o inadecuados.</li>
        <li>Usted es responsable de revisar y validar todo el contenido antes de publicarlo.</li>
        <li>o2Wave no garantiza la exactitud del contenido generado ni su adecuación a su público objetivo o a una finalidad concreta.</li>
      </ul>

      <h2>8. Conductas prohibidas</h2>
      <p>Queda prohibido utilizar el servicio para:</p>
      <ul>
        <li>Generar o difundir contenido ilegal.</li>
        <li>Suplantar la identidad de personas o entidades.</li>
        <li>Vulnerar derechos de autor o de propiedad intelectual de terceros.</li>
        <li>Realizar ingeniería inversa del servicio.</li>
        <li>Extraer datos de forma automatizada (scraping).</li>
        <li>Revender o ceder el acceso al servicio.</li>
        <li>Crear múltiples cuentas para eludir los límites de uso.</li>
      </ul>

      <h2>9. Suspensión y cancelación de cuentas</h2>
      <p>
        o2Wave podrá suspender o eliminar cuentas que incumplan estos términos. Salvo en casos graves o
        urgentes, se notificará previamente al usuario.
      </p>

      <h2>10. Modificaciones del servicio</h2>
      <p>
        o2Wave podrá modificar funcionalidades, planes y precios, notificándolo con una antelación
        razonable a través de los medios de contacto facilitados.
      </p>

      <h2>11. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, o2Wave no responde de lucros cesantes, daños indirectos o
        consecuentes derivados del uso del servicio. La responsabilidad máxima de o2Wave se limita al
        importe efectivamente abonado por el usuario en los 12 meses anteriores al hecho que origine la
        reclamación.
      </p>

      <h2>12. Legislación aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la legislación española. Para la resolución de cualquier
        controversia, las partes se someten a los juzgados y tribunales de Barcelona, salvo que la
        normativa de consumo aplicable disponga otro fuero.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos términos, escriba a <a href="mailto:info@generacion-o2.org">info@generacion-o2.org</a>.
      </p>
    </LegalPage>
  );
}
