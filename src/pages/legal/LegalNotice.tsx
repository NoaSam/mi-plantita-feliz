import { Link } from "react-router-dom";
import LegalPageLayout from "./LegalPageLayout";

export default function LegalNotice() {
  return (
    <LegalPageLayout title="Aviso Legal" lastUpdated="13 de abril de 2026">
      <h2>1. Datos identificativos (Art. 10 LSSI-CE)</h2>
      <p>
        En cumplimiento del deber de información establecido en el artículo 10
        de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSI-CE), se informan los
        siguientes datos:
      </p>
      <ul>
        <li><strong>Titular:</strong> Noemí Santos</li>
        <li><strong>Domicilio:</strong> Madrid, España</li>
        <li><strong>Email de contacto:</strong> noesantos@gmail.com</li>
        <li><strong>Nombre comercial de la app:</strong> Mi jardín</li>
        <li><strong>Sitio web:</strong> https://mi-plantita-feliz.vercel.app</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        Esta aplicación web (en adelante, "la App") proporciona un servicio de
        identificación de plantas mediante inteligencia artificial. El usuario
        puede fotografiar o subir imágenes de plantas para obtener información
        sobre su especie, cuidados y estado de salud.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso y uso de la App atribuye la condición de usuario e implica la
        aceptación de las presentes condiciones. Si no estás de acuerdo con
        alguna de ellas, te rogamos que no utilices la App.
      </p>
      <p>El usuario se compromete a:</p>
      <ul>
        <li>Hacer un uso lícito y diligente de la App.</li>
        <li>No utilizar la App con fines ilícitos o contrarios al orden público.</li>
        <li>
          No intentar acceder a áreas restringidas de los sistemas informáticos
          del titular.
        </li>
        <li>No introducir virus ni programas dañinos.</li>
      </ul>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos de la App (textos, código fuente, diseño gráfico,
        logotipos, iconos, imágenes propias y software) son propiedad del
        titular o de sus licenciantes y están protegidos por la legislación
        española e internacional de propiedad intelectual e industrial.
      </p>
      <p>
        Las fotos subidas por los usuarios son propiedad de estos. Al subirlas,
        el usuario concede al titular una licencia limitada para procesarlas
        mediante los servicios de IA con el fin exclusivo de prestar el
        servicio.
      </p>

      <h2>5. Limitación de responsabilidad</h2>
      <ul>
        <li>
          Las identificaciones de plantas realizadas por IA son orientativas y
          <strong> no constituyen asesoramiento botánico, agrícola o
          médico profesional</strong>.
        </li>
        <li>
          El titular no se responsabiliza de daños derivados del uso de la
          información proporcionada por la App (por ejemplo, toxicidad de
          plantas, tratamientos inadecuados, etc.).
        </li>
        <li>
          No se garantiza la disponibilidad continua e ininterrumpida de la App.
        </li>
        <li>
          El titular no se responsabiliza de los contenidos o políticas de
          privacidad de los servicios de terceros utilizados (Supabase, APIs de
          IA, PostHog, Vercel).
        </li>
      </ul>

      <h2>6. Enlaces a terceros</h2>
      <p>
        La App puede contener enlaces a sitios web de terceros. El titular no
        tiene control sobre dichos sitios y no asume responsabilidad alguna
        sobre sus contenidos o políticas de privacidad.
      </p>

      <h2>7. Protección de datos</h2>
      <p>
        El tratamiento de datos personales se rige por nuestra{" "}
        <Link to="/privacidad">Política de Privacidad</Link> y nuestra{" "}
        <Link to="/cookies">Política de Cookies</Link>.
      </p>

      <h2>8. Legislación aplicable y jurisdicción</h2>
      <p>
        Las presentes condiciones se rigen por la legislación española. Para
        cualquier controversia derivada del uso de la App, las partes se someten
        a los Juzgados y Tribunales de Madrid, salvo que la
        normativa aplicable establezca otro fuero.
      </p>
    </LegalPageLayout>
  );
}
