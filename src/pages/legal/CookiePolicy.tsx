import { Link } from "react-router-dom";
import LegalPageLayout from "./LegalPageLayout";

export default function CookiePolicy() {
  return (
    <LegalPageLayout title="Política de Cookies" lastUpdated="13 de abril de 2026">
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu
        dispositivo cuando visitas una página web. En esta app también usamos
        tecnologías similares como <strong>localStorage</strong> (almacenamiento
        local del navegador), que cumplen una función parecida.
      </p>

      <h2>2. ¿Qué cookies y tecnologías de almacenamiento usamos?</h2>

      <h3>Estrictamente necesarias</h3>
      <p>
        Son imprescindibles para el funcionamiento de la app. No requieren tu
        consentimiento.
      </p>
      <ul>
        <li>
          <strong>Tokens de autenticación de Supabase</strong>
          <br />
          Tipo: localStorage
          <br />
          Finalidad: mantener tu sesión iniciada de forma segura.
          <br />
          Duración: mientras la sesión esté activa.
          <br />
          Proveedor: Supabase
        </li>
        <li>
          <strong>plantita_consent</strong>
          <br />
          Tipo: localStorage
          <br />
          Finalidad: recordar tus preferencias de cookies para no volver a
          preguntarte.
          <br />
          Duración: indefinida (hasta que borres los datos del navegador).
          <br />
          Proveedor: propia
        </li>
        <li>
          <strong>plantita_anon_id</strong>
          <br />
          Tipo: localStorage
          <br />
          Finalidad: identificador anónimo para asociar búsquedas de plantas
          realizadas antes de crear cuenta. Permite que tu historial se vincule
          a tu cuenta cuando te registras.
          <br />
          Duración: indefinida.
          <br />
          Proveedor: propia
        </li>
        <li>
          <strong>plantita_geo_permission</strong>
          <br />
          Tipo: localStorage
          <br />
          Finalidad: recordar si has dado permiso para guardar la ubicación de
          tus fotos.
          <br />
          Duración: indefinida.
          <br />
          Proveedor: propia
        </li>
        <li>
          <strong>plant-history</strong>
          <br />
          Tipo: localStorage
          <br />
          Finalidad: caché local del historial de búsquedas para usuarios no
          registrados (modo offline).
          <br />
          Duración: indefinida.
          <br />
          Proveedor: propia
        </li>
      </ul>

      <h3>Analíticas (requieren consentimiento)</h3>
      <p>
        Solo se activan si aceptas las cookies analíticas en el banner de
        cookies. Nos ayudan a entender cómo se usa la app para mejorarla.
      </p>
      <ul>
        <li>
          <strong>PostHog</strong>
          <br />
          Tipo: cookies y localStorage
          <br />
          Finalidad: analítica de producto (páginas visitadas, interacciones,
          errores).
          <br />
          Duración: hasta 12 meses.
          <br />
          Proveedor: PostHog Inc. (instancia EU — eu.i.posthog.com)
          <br />
          Más info:{" "}
          <a
            href="https://posthog.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            posthog.com/privacy
          </a>
        </li>
      </ul>

      <h3>Grabación de sesión (requiere consentimiento)</h3>
      <p>
        Solo se activa si aceptas esta opción en la configuración de cookies.
      </p>
      <ul>
        <li>
          <strong>PostHog Session Recording</strong>
          <br />
          Tipo: cookies y localStorage
          <br />
          Finalidad: grabación anónima de la interacción con la app para
          detectar errores y mejorar la experiencia. Las entradas de texto están
          enmascaradas.
          <br />
          Duración: hasta 12 meses.
          <br />
          Proveedor: PostHog Inc. (instancia EU)
        </li>
      </ul>

      <h2>3. ¿Cómo puedes gestionar las cookies?</h2>
      <ul>
        <li>
          <strong>Banner de cookies:</strong> al visitar la app por primera vez
          puedes aceptar, rechazar o configurar las cookies.
        </li>
        <li>
          <strong>Cambiar preferencias:</strong> puedes modificar tu elección en
          cualquier momento borrando los datos del sitio desde tu navegador. Al
          volver a entrar, el banner de cookies aparecerá de nuevo.
        </li>
        <li>
          <strong>Configuración del navegador:</strong> también puedes borrar
          cookies y datos de almacenamiento local desde la configuración de tu
          navegador.
        </li>
      </ul>

      <h2>4. Base legal</h2>
      <p>
        Las cookies estrictamente necesarias se amparan en el interés legítimo
        del responsable (Art. 6.1.f RGPD) y en la excepción del Art. 22.2 de la
        LSSI-CE. Las cookies analíticas y de grabación de sesión se basan en tu
        consentimiento (Art. 6.1.a RGPD, Art. 22.2 LSSI-CE).
      </p>

      <h2>5. Más información</h2>
      <p>
        Para más detalles sobre cómo tratamos tus datos personales, consulta
        nuestra{" "}
        <Link to="/privacidad">Política de Privacidad</Link>.
      </p>
      <p>
        Si tienes preguntas sobre las cookies, escríbenos a noesantos@gmail.com.
      </p>
    </LegalPageLayout>
  );
}
