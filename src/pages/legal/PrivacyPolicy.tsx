import { Link } from "react-router-dom";
import LegalPageLayout from "./LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Política de Privacidad" lastUpdated="13 de abril de 2026">
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Identidad:</strong> [COMPLETAR — nombre o razón social]</li>
        <li><strong>NIF/CIF:</strong> [COMPLETAR]</li>
        <li><strong>Dirección:</strong> [COMPLETAR]</li>
        <li><strong>Email de contacto:</strong> [COMPLETAR]</li>
      </ul>

      <h2>2. Qué datos personales recogemos</h2>
      <p>Dependiendo de cómo uses la app, podemos tratar los siguientes datos:</p>
      <ul>
        <li>
          <strong>Datos de registro:</strong> dirección de correo electrónico y
          contraseña (cifrada).
        </li>
        <li>
          <strong>Fotografías de plantas:</strong> las imágenes que subes o capturas
          para identificar plantas.
        </li>
        <li>
          <strong>Historial de búsquedas:</strong> resultados de identificaciones
          guardados asociados a tu cuenta.
        </li>
        <li>
          <strong>Datos de ubicación (opcional):</strong> coordenadas GPS del lugar
          donde se tomó la foto, solo si das permiso explícito.
        </li>
        <li>
          <strong>Datos de uso y analítica:</strong> páginas visitadas, interacciones
          con la app, tipo de dispositivo y navegador. Solo se recogen si aceptas las
          cookies analíticas.
        </li>
        <li>
          <strong>Identificador anónimo:</strong> un UUID almacenado en tu navegador
          para asociar búsquedas antes de crear cuenta.
        </li>
      </ul>

      <h2>3. Para qué usamos tus datos (finalidad y base legal)</h2>
      <ul>
        <li>
          <strong>Prestación del servicio</strong> (identificación de plantas, historial,
          cuenta de usuario): base legal — ejecución de un contrato (Art. 6.1.b RGPD).
        </li>
        <li>
          <strong>Analítica y mejora del producto</strong> (PostHog): base legal —
          consentimiento (Art. 6.1.a RGPD). Solo se activa si aceptas cookies analíticas.
        </li>
        <li>
          <strong>Seguridad y mantenimiento</strong> (logs de errores, prevención de
          abusos): base legal — interés legítimo (Art. 6.1.f RGPD).
        </li>
      </ul>

      <h2>4. Terceros que reciben tus datos</h2>
      <p>
        Para prestar el servicio, compartimos datos con los siguientes proveedores:
      </p>
      <ul>
        <li>
          <strong>Supabase (Supabase Inc., EE.UU.):</strong> almacena tu cuenta,
          historial de búsquedas y fotos. Instancia en la UE (West EU — Irlanda).
          Transferencia internacional amparada por Cláusulas Contractuales Tipo (SCCs).
        </li>
        <li>
          <strong>Anthropic (Claude API, EE.UU.):</strong> recibe las fotos de
          plantas para su análisis por IA. Las imágenes se procesan y no se almacenan
          permanentemente. Transferencia amparada por SCCs.
        </li>
        <li>
          <strong>Google (Gemini API, EE.UU.):</strong> servicio adicional de IA para
          análisis de plantas. Transferencia amparada por SCCs y la decisión de
          adecuación UE-EE.UU. (Data Privacy Framework).
        </li>
        <li>
          <strong>OpenAI (GPT-4o API, EE.UU.):</strong> servicio adicional de IA para
          análisis de plantas. Transferencia amparada por SCCs y Data Privacy Framework.
        </li>
        <li>
          <strong>PostHog (PostHog Inc., EE.UU., instancia EU):</strong> analítica de
          producto. Solo recibe datos si aceptas cookies analíticas. Datos almacenados
          en servidores de la UE (eu.i.posthog.com). Transferencia amparada por SCCs.
        </li>
        <li>
          <strong>Vercel (Vercel Inc., EE.UU.):</strong> alojamiento de la app y CDN.
          Transferencia amparada por SCCs y Data Privacy Framework.
        </li>
      </ul>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Algunos de nuestros proveedores están ubicados en Estados Unidos. Todas las
        transferencias de datos fuera del Espacio Económico Europeo están protegidas
        mediante Cláusulas Contractuales Tipo (SCCs) aprobadas por la Comisión
        Europea y/o el Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework),
        según el proveedor.
      </p>

      <h2>6. Durante cuánto tiempo conservamos tus datos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta y historial:</strong> mientras mantengas tu cuenta
          activa. Al eliminar tu cuenta, se borran todos los datos asociados.
        </li>
        <li>
          <strong>Fotos enviadas a las APIs de IA:</strong> se transmiten para su
          procesamiento y no se almacenan permanentemente en los servidores de los
          proveedores de IA.
        </li>
        <li>
          <strong>Datos de analítica:</strong> máximo 12 meses desde su recogida.
        </li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>
        Como titular de los datos, tienes los siguientes derechos conforme al RGPD:
      </p>
      <ul>
        <li>
          <strong>Acceso:</strong> conocer qué datos personales tratamos sobre ti.
        </li>
        <li>
          <strong>Rectificación:</strong> corregir datos inexactos o incompletos.
        </li>
        <li>
          <strong>Supresión:</strong> solicitar la eliminación de tus datos
          ("derecho al olvido").
        </li>
        <li>
          <strong>Limitación del tratamiento:</strong> restringir el uso de tus datos
          en ciertos casos.
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en un formato
          estructurado y legible por máquina.
        </li>
        <li>
          <strong>Oposición:</strong> oponerte al tratamiento de tus datos en ciertos
          supuestos.
        </li>
        <li>
          <strong>Retirada del consentimiento:</strong> puedes retirar tu
          consentimiento en cualquier momento (por ejemplo, para cookies analíticas)
          sin que afecte a la licitud del tratamiento previo.
        </li>
      </ul>

      <h3>Cómo ejercer tus derechos</h3>
      <ul>
        <li>
          <strong>Exportar tus datos:</strong> desde la sección{" "}
          <Link to="/ajustes">Ajustes</Link> de la app puedes descargar todos tus
          datos en formato JSON.
        </li>
        <li>
          <strong>Eliminar tu cuenta:</strong> desde{" "}
          <Link to="/ajustes">Ajustes</Link> puedes solicitar la eliminación de tu
          cuenta y todos los datos asociados.
        </li>
        <li>
          <strong>Otras solicitudes:</strong> envía un email a [COMPLETAR — email de
          contacto] indicando tu solicitud y adjuntando copia de tu documento de
          identidad.
        </li>
      </ul>

      <h3>Reclamación ante la autoridad de control</h3>
      <p>
        Si consideras que el tratamiento de tus datos no es conforme a la normativa,
        tienes derecho a presentar una reclamación ante la{" "}
        <a
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agencia Española de Protección de Datos (AEPD)
        </a>
        , C/ Jorge Juan, 6, 28001 Madrid.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger tus datos:
        cifrado en tránsito (HTTPS/TLS), contraseñas hasheadas, control de acceso
        basado en filas (RLS) en la base de datos, y claves API almacenadas
        exclusivamente en el servidor.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        Este servicio no está dirigido a menores de 14 años. Si eres menor de 14
        años, no debes crear una cuenta ni utilizar este servicio sin el
        consentimiento de tus padres o tutores legales.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Podemos actualizar esta política de privacidad. Si realizamos cambios
        sustanciales, te lo notificaremos mediante un aviso en la app o por email.
        La fecha de la última actualización aparece al inicio de este documento.
      </p>
    </LegalPageLayout>
  );
}
