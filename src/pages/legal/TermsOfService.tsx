import { Link } from "react-router-dom";
import LegalPageLayout from "./LegalPageLayout";

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Términos y Condiciones de Uso" lastUpdated="13 de abril de 2026">
      <h2>1. Identificación del titular</h2>
      <ul>
        <li><strong>Titular:</strong> Noemí Santos</li>
        <li><strong>Email de contacto:</strong> noesantos@gmail.com</li>
      </ul>

      <h2>2. Descripción del servicio</h2>
      <p>
        Mi jardín (en adelante, "la App") es una aplicación web progresiva (PWA) que
        permite a los usuarios:
      </p>
      <ul>
        <li>Identificar plantas a partir de fotografías mediante inteligencia artificial.</li>
        <li>Obtener información sobre cuidados y diagnóstico de enfermedades de plantas.</li>
        <li>Guardar un historial de plantas identificadas asociado a su cuenta.</li>
      </ul>

      <h2>3. Aceptación de las condiciones</h2>
      <p>
        El registro en la App y su uso implican la aceptación íntegra de estos
        Términos y Condiciones, así como de la{" "}
        <Link to="/privacidad">Política de Privacidad</Link> y la{" "}
        <Link to="/cookies">Política de Cookies</Link>.
      </p>

      <h2>4. Registro y cuenta de usuario</h2>
      <ul>
        <li>
          Para acceder a todas las funcionalidades (historial, guardado de plantas)
          es necesario crear una cuenta con email y contraseña.
        </li>
        <li>
          El usuario es responsable de mantener la confidencialidad de sus
          credenciales de acceso.
        </li>
        <li>
          Debes tener al menos 14 años para crear una cuenta. Si eres menor de 14
          años, necesitas el consentimiento de tus padres o tutores.
        </li>
        <li>
          Nos reservamos el derecho de suspender o eliminar cuentas que infrinjan
          estas condiciones.
        </li>
      </ul>

      <h2>5. Uso de la inteligencia artificial</h2>
      <p>
        La App utiliza modelos de inteligencia artificial de terceros (Anthropic
        Claude, Google Gemini y OpenAI GPT-4o) para el análisis de imágenes de
        plantas. Es importante que tengas en cuenta lo siguiente:
      </p>
      <ul>
        <li>
          Los resultados de la identificación son <strong>orientativos</strong> y
          pueden contener errores.
        </li>
        <li>
          La App <strong>no sustituye el asesoramiento de un profesional</strong>{" "}
          botánico, agrónomo o veterinario.
        </li>
        <li>
          En caso de duda sobre la toxicidad de una planta o su posible peligro
          para personas o animales, consulta siempre con un profesional.
        </li>
        <li>
          Los diagnósticos de enfermedades son aproximaciones basadas en análisis
          visual. Para un diagnóstico preciso, consulta a un especialista.
        </li>
      </ul>

      <h2>6. Contenido del usuario</h2>
      <ul>
        <li>
          Las fotografías que subes son de tu propiedad. Al subirlas, nos concedes
          una licencia limitada, no exclusiva y revocable para procesarlas mediante
          los servicios de IA con el fin exclusivo de prestarte el servicio.
        </li>
        <li>
          No debes subir imágenes que contengan datos personales de terceros,
          contenido ilegal o material protegido por derechos de autor de terceros.
        </li>
        <li>
          Nos reservamos el derecho de eliminar contenido que infrinja estas
          condiciones.
        </li>
      </ul>

      <h2>7. Gratuidad del servicio</h2>
      <p>
        Actualmente, el uso de la App es gratuito. Nos reservamos el derecho de
        introducir funcionalidades de pago en el futuro, lo cual se comunicaría
        con antelación suficiente.
      </p>

      <h2>8. Propiedad intelectual</h2>
      <p>
        Todos los elementos de la App (diseño, código, logotipos, textos) son
        propiedad del titular o de sus licenciantes. Queda prohibida su
        reproducción, distribución o transformación sin autorización expresa.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <ul>
        <li>
          El titular no garantiza la disponibilidad continua e ininterrumpida del
          servicio.
        </li>
        <li>
          No nos hacemos responsables de los daños directos o indirectos que
          pudieran derivarse del uso de la información proporcionada por la App,
          incluyendo pero no limitado a: daños a plantas, intoxicaciones por
          identificación incorrecta de plantas tóxicas, o pérdidas económicas.
        </li>
        <li>
          El usuario acepta que la IA puede cometer errores y actúa bajo su propia
          responsabilidad al seguir las recomendaciones de la App.
        </li>
      </ul>

      <h2>10. Modificaciones</h2>
      <p>
        Nos reservamos el derecho de modificar estos Términos en cualquier
        momento. Los cambios sustanciales se notificarán con antelación razonable
        mediante un aviso en la App o por email. El uso continuado de la App tras
        la notificación implica la aceptación de los nuevos términos.
      </p>

      <h2>11. Resolución y baja</h2>
      <p>
        Puedes dejar de usar la App en cualquier momento y eliminar tu cuenta
        desde la sección <Link to="/ajustes">Ajustes</Link>. Al eliminar tu
        cuenta, se borrarán todos tus datos de acuerdo con nuestra{" "}
        <Link to="/privacidad">Política de Privacidad</Link>.
      </p>

      <h2>12. Legislación aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para cualquier
        controversia, las partes se someten a los Juzgados y Tribunales de
        Madrid, salvo que la normativa de consumidores establezca
        otro fuero.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Si tienes preguntas sobre estos Términos, puedes escribirnos a
        noesantos@gmail.com.
      </p>
    </LegalPageLayout>
  );
}
