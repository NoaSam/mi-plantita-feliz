# Google Play Store Listing — Mi Jardín

Textos y assets listos para copiar-pegar en Google Play Console.

---

## Título (30 chars max)

```
Mi Jardín: Identificar Plantas
```
30/30. Coincidencia exacta con la consulta más buscada. Alternativa a 29 si se
prefiere el imperativo: `Mi Jardín: Identifica Plantas`.

---

## Descripción corta (80 chars max)

```
Identifica plantas con una foto. Cuidados, diagnóstico y calendario de riego.
```
77/80. La anterior decía "enfermedades y diagnóstico con IA": lo mismo dos veces
y un "con IA" que no es lo que se busca. El hueco lo ocupa el riego, que no
aparecía en ninguna parte de la ficha.

---

## Descripción completa (4.000 chars max)

```
¿Qué planta es esta? Hazle una foto y lo sabrás en segundos: cómo se llama, qué cuidados necesita y, si tiene mal aspecto, qué le está pasando.

Mi Jardín usa inteligencia artificial para identificar plantas y te explica qué hacer con ellas en un lenguaje que se entiende, sin jerga botánica.

IDENTIFICA CUALQUIER PLANTA
Haz una foto con la cámara o elige una de tu galería. En segundos tienes el nombre común, el nombre científico y la familia botánica.

DESCUBRE QUÉ LE PASA
Diagnóstico de enfermedades y plagas a partir de la foto. ¿Hojas amarillas, manchas, aspecto triste? Te decimos la causa probable y cómo tratarla. Exceso de riego, falta de luz, hongos: con el problema identificado, la solución es fácil.

CUIDADOS CLAROS, PLANTA A PLANTA
Una guía de cuidados para esa planta concreta: riego, luz, temperatura, sustrato y abono. No consejos genéricos que valen para todo y no sirven para nada.

NO SE TE OLVIDA REGAR
Añade tus plantas a tu jardín y la app lleva la cuenta por ti: cuáles toca regar hoy y cuáles pueden esperar. Ajusta la frecuencia de cada una y marca el riego cuando lo hagas.

TUS PLANTAS, EN UN SITIO
Todo lo que identificas se guarda con su foto y su fecha. Busca y filtra en tu colección cuando quieras volver a consultarlo.

LAS QUE TE ENCUENTRAS POR AHÍ
Las plantas que descubres en un paseo se guardan en un mapa, con el sitio donde las viste. Tu propio registro de lo que crece cerca de casa.

PARA QUIÉN ES
Para quien tiene plantas de interior y no entiende por qué se le mueren. Para quien empieza en la jardinería y agradece que se lo expliquen claro. Y para quien va por la calle, ve una flor y quiere saber cómo se llama.

TU PRIVACIDAD
Tus fotos se analizan de forma segura y tus plantas son solo tuyas. Puedes consultar la política de privacidad dentro de la app.

Descarga Mi Jardín y empieza por esa planta que te regalaron y nunca supiste cuál era.
```
1894/4000. La anterior repetía la lista de funcionalidades dos veces
("Qué puedes hacer" y "Funcionalidades principales") y se dejaba fuera el
calendario de riego y el mapa de descubrimientos, que ya existen en la app.

**No prometer recordatorios ni notificaciones.** La app no tiene ningún plugin de
notificaciones: Regar es un calendario que se consulta, no te avisa. Decir
"recordatorios" sería una promesa falsa en la ficha.

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
