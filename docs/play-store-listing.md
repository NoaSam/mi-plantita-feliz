# Google Play Store Listing — Mi Jardín

Textos y assets listos para copiar-pegar en Google Play Console.

---

## Título (30 chars max)

```
Mi Jardín - Identificar Plantas
```
(31 chars — alternativa si no cabe:)
```
Mi Jardín: Identifica Plantas
```
(30 chars)

---

## Descripción corta (80 chars max)

```
Identifica plantas con una foto. Cuidados, enfermedades y diagnóstico con IA.
```

---

## Descripción completa (4.000 chars max)

```
Saca una foto de cualquier planta y descubre al instante qué es, cómo cuidarla y si tiene algún problema de salud. Mi Jardín usa inteligencia artificial para identificar plantas y darte información práctica y fácil de entender.

Ideal para personas que tienen plantas en casa, jardineros principiantes o cualquiera que se encuentre una planta y quiera saber su nombre.

Qué puedes hacer con Mi Jardín:

- Identificar plantas con una foto de la cámara o tu galería
- Conocer el nombre común, nombre científico y familia botánica
- Consultar una guía de cuidados personalizada: riego, luz, temperatura, sustrato y frecuencia de abono
- Obtener un diagnóstico de enfermedades: síntomas detectados, causa probable y tratamiento recomendado
- Guardar un historial de todas tus búsquedas con foto, fecha y resultado
- Buscar y filtrar en tu colección de plantas guardadas

Cómo funciona:

1. Abre la app y haz una foto o sube una imagen de tu galería
2. La inteligencia artificial analiza la planta en segundos
3. Consulta el resultado: qué planta es, cómo cuidarla y qué le pasa

Sin jerga botánica innecesaria. Todo explicado de forma cercana y clara para que cualquier persona pueda entender y aplicar los cuidados.

Mi Jardín es una herramienta para quienes quieren cuidar mejor sus plantas, identificar flores y árboles durante un paseo, o simplemente descubrir el nombre de esa planta que les regalaron.

Funcionalidades principales:

- Identificación de plantas por foto con IA avanzada
- Guía de cuidados completa para cada planta
- Diagnóstico visual de enfermedades y plagas
- Historial de búsquedas guardado en tu cuenta
- Búsqueda y filtro por nombre y mes
- Interfaz sencilla pensada para móvil
- Registro con email, sin complicaciones

Tu privacidad es importante. Las fotos se analizan de forma segura y tus datos están protegidos. Consulta nuestra política de privacidad dentro de la app.

Descarga Mi Jardín y empieza a identificar tus plantas hoy.
```

---

## Categoría

**Educación** (Education)

Rationale: PictureThis, PlantNet y Seek están en Educación. Es donde los usuarios buscan apps de identificación de plantas.

---

## Content Rating (respuestas al cuestionario IARC)

| Área | Respuesta |
|------|-----------|
| Violencia | Ninguna |
| Contenido sexual | Ninguno |
| Lenguaje | Ninguno |
| Sustancias controladas | Ninguno |
| Apuestas | Ninguno |
| Contenido generado por usuarios | No (fotos son privadas, no se comparten) |
| Datos personales | Sí (email, fotos, historial) |
| Ubicación | No |
| Compras in-app | No (por ahora) |

**Rating esperado:** PEGI 3 / Everyone

---

## Data Safety Form

| Dato | Se recoge | Se comparte con terceros | Propósito |
|------|-----------|--------------------------|-----------|
| Email | Sí | No | Autenticación (Supabase Auth) |
| Fotos | Sí | Sí (Anthropic API) | Análisis/identificación de plantas |
| Historial de búsquedas | Sí | No | Funcionalidad de la app |
| Datos de uso/analítica | Sí (con consentimiento) | Sí (PostHog) | Mejora del producto |

Declarar también:
- Datos cifrados en tránsito: Sí (HTTPS)
- El usuario puede solicitar eliminación de datos: Sí (desde Ajustes)

---

## Assets gráficos (especificaciones)

| Asset | Tamaño | Formato | Notas |
|-------|--------|---------|-------|
| Icono | 512x512 px | PNG 32-bit (con alpha) | Sin esquinas redondeadas (Google las aplica). Mantener elementos dentro de la safe zone. 1-2 colores, símbolo de planta/hoja simple |
| Feature graphic | 1024x500 px | JPEG o PNG | Aparece arriba del listing. Mostrar marca + qué hace la app |
| Screenshots | 1080x1920 px | JPEG o PNG 24-bit | Mínimo 4, recomendado 6-8. Retrato (9:16) |

### Screenshots recomendados (en orden)

1. **Hero:** Cámara apuntando a planta con resultado. Texto: "Identifica cualquier planta con una foto"
2. **Cuidados:** Pantalla de detalle con riego, luz, temperatura. Texto: "Cuidados personalizados para cada planta"
3. **Diagnóstico:** Planta enferma con diagnóstico. Texto: "Diagnóstico de enfermedades al instante"
4. **Historial:** Lista de plantas guardadas. Texto: "Tu colección de plantas guardada"
5. **Cómo funciona:** 3 pasos (foto, análisis, resultado). Texto: "Así de fácil"
6. **Login:** Pantalla de registro simple. Texto: "Crea tu cuenta en segundos"

---

## Privacy Policy URL

```
https://mi-plantita-feliz.vercel.app/privacidad
```

---

## Keywords objetivo (para distribuir en título + descripciones)

**Primarios (3-5 repeticiones en descripción larga):**
- identificar plantas
- cuidado de plantas
- enfermedades de plantas

**Secundarios (1-2 repeticiones):**
- planta por foto
- qué planta es
- diagnóstico
- jardín / jardinería
- flores / árboles
- nombre de planta
- guía de cuidados
- inteligencia artificial / IA

---

## Checklist pre-publicación

- [ ] Título final elegido (30 chars max)
- [ ] Descripción corta revisada (80 chars max)
- [ ] Descripción larga revisada (4.000 chars max)
- [ ] Icono 512x512 preparado
- [ ] Feature graphic 1024x500 preparada
- [ ] 4-8 screenshots 1080x1920 preparados
- [ ] Categoría: Educación
- [ ] Content rating completado
- [ ] Data Safety form completado
- [ ] Privacy policy URL configurada
- [ ] APK/AAB firmado y subido
- [ ] Testing track (internal/closed) configurado
