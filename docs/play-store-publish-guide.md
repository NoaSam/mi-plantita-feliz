# Guía paso a paso: Publicar Mi Jardín en Google Play Store

Guía para subir la app usando la cuenta de desarrollador de un amigo.

---

## Antes de empezar

Necesitas:
- Acceso a [Google Play Console](https://play.google.com/console) con la cuenta de tu amigo
- Los assets en `store-assets/` (ya generados)
- Los textos en `docs/play-store-listing.md` (ya preparados)

---

## Paso 0: Instalar Android Studio

Android Studio es la herramienta que convierte el código en el archivo `.aab` que Google Play acepta. Solo necesitas usarlo para generar ese archivo.

1. Descárgalo gratis desde [developer.android.com/studio](https://developer.android.com/studio) (~1GB)
2. Instálalo aceptando todo por defecto
3. En la primera apertura te pedirá instalar el **Android SDK** — acepta, lo necesitas
4. Una vez instalado, puedes cerrarlo. Lo abrirás cuando toque generar el build.

---

## Paso 1: Generar el AAB firmado

El **AAB** (Android App Bundle) es el archivo que subes a Google Play. Es como un .zip que contiene tu app lista para instalar. Google necesita que esté "firmado" con una clave única tuya para verificar que eres tú quien publica.

### 1.1 Preparar el build web

Desde la terminal, en la raíz del proyecto:

```bash
npm run build:android && npx cap sync android
```

Esto genera el código web optimizado y lo copia dentro de la carpeta `android/`.

### 1.2 Abrir el proyecto en Android Studio

```bash
npx cap open android
```

Esto abre Android Studio con el proyecto Android ya cargado. Espera a que termine de sincronizar (barra de progreso abajo).

### 1.3 Generar el AAB firmado

1. En Android Studio, menú **Build → Generate Signed Bundle / APK**
2. Selecciona **Android App Bundle** → Next
3. Te pide una **keystore** (la clave de firma):
   - Si no tienes una, click **Create new...**
   - Elige dónde guardarla (fuera del proyecto, en un sitio seguro)
   - Pon una contraseña y apúntala — **si la pierdes, no podrás actualizar la app nunca más**
   - Alias: `mi-jardin`
   - Rellena al menos el nombre y país (ES)
4. Selecciona build variant: **release** → Finish
5. Android Studio genera el archivo en:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
   Ese es el archivo que subes a Google Play Console.

> **IMPORTANTE:** Guarda la keystore (`.jks` o `.keystore`) en un lugar seguro. Haz una copia de seguridad. Sin ella no podrás publicar actualizaciones.
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Paso 2: Crear la app en Google Play Console

1. Ve a [play.google.com/console](https://play.google.com/console)
2. Click **"Crear app"**
3. Rellena:
   - **Nombre de la app:** `Mi Jardín: Identifica Plantas`
   - **Idioma predeterminado:** Español (España)
   - **App o juego:** App
   - **Gratis o de pago:** Gratis
   - Acepta las declaraciones

---

## Paso 3: Configurar el Store Listing

Ve a **Presencia en la tienda → Ficha de Play Store principal**

### 3.1 Textos

Copia desde `docs/play-store-listing.md`:

| Campo | Qué copiar |
|-------|-----------|
| Nombre de la app | `Mi Jardín: Identifica Plantas` |
| Descripción breve | `Identifica plantas con una foto. Cuidados, enfermedades y diagnóstico con IA.` |
| Descripción completa | El bloque de texto largo del doc |

### 3.2 Gráficos

Sube desde la carpeta `store-assets/`:

| Campo | Archivo |
|-------|---------|
| Icono de la app | `icon-512.png` |
| Gráfico de funciones | `feature-graphic.png` |
| Capturas de pantalla (Teléfono) | `screenshot-01-home.png`, `screenshot-02-result.png`, `screenshot-03-history.png`, `screenshot-04-login.png` |

### 3.3 Categoría

- **Categoría:** Educación
- **Etiquetas:** Plantas, Jardinería, Identificación

---

## Paso 4: Content Rating (Clasificación de contenido)

Ve a **Política → Clasificación del contenido de la app**

1. Click "Iniciar cuestionario"
2. Email de contacto: el de tu amigo (titular de la cuenta)
3. Categoría: "Utilidad, productividad, comunicación u otro"
4. Responde todo como "No" excepto:
   - ¿La app recopila datos personales? → **Sí**
5. Confirma y guarda
6. Resultado esperado: **PEGI 3 / Everyone**

---

## Paso 5: Data Safety (Seguridad de los datos)

Ve a **Política → Seguridad de los datos**

Responde al formulario:

### ¿La app recopila o comparte datos de usuario?
→ **Sí**

### Tipos de datos:

**Información personal:**
- Dirección de correo electrónico → Se recoge → No se comparte
  - Propósito: Gestión de cuentas
  - Obligatorio: Sí

**Fotos y vídeos:**
- Fotos → Se recoge → Se comparte
  - Propósito: Funcionalidad de la app
  - Se comparte con: Proveedores de servicios (Anthropic API para análisis)
  - Obligatorio: Sí

**Actividad en la app:**
- Historial de búsquedas en la app → Se recoge → No se comparte
  - Propósito: Funcionalidad de la app

**Análisis de la app:**
- Datos de diagnóstico → Se recoge → Se comparte
  - Se comparte con: Proveedores de análisis (PostHog)
  - Obligatorio: No (el usuario puede rechazar cookies)

### Prácticas de seguridad:
- ¿Los datos se cifran en tránsito? → **Sí**
- ¿Los usuarios pueden solicitar que se eliminen sus datos? → **Sí**

---

## Paso 6: Privacy Policy (Política de privacidad)

Ve a **Política → Política de privacidad**

URL:
```
https://mi-plantita-feliz.vercel.app/privacidad
```

---

## Paso 7: Configuración de la app

Ve a **Configuración de la app** y completa las secciones obligatorias:

### 7.1 Acceso a la app
→ "Todas las funciones están disponibles sin acceso especial"
(el login es opcional, la identificación funciona sin cuenta)

### 7.2 Anuncios
→ "Mi app no contiene anuncios"

### 7.3 Público objetivo
→ Selecciona: **18+** o **13+**
(NO selecciones menores de 13, requiere cumplir COPPA y es más complejo)

### 7.4 Apps de noticias
→ No

### 7.5 Apps de salud (si aparece)
→ No (la app identifica plantas, no da consejos médicos)

---

## Paso 8: Subir el AAB a un track de pruebas

Recomendación: empieza con **pruebas internas** antes de producción.

1. Ve a **Publicación → Pruebas → Pruebas internas**
2. Click "Crear nueva versión"
3. **App signing by Google Play:** Acepta (recomendado). Google gestionará la clave de firma en producción.
4. Sube el AAB (`app-release.aab`)
5. **Nombre de la versión:** `1.0.0`
6. **Notas de la versión:**
   ```
   al ir a 
   ```
7. Click "Revisar versión" → "Iniciar lanzamiento a pruebas internas"

### Añadir testers

1. En Pruebas internas → Pestaña "Testers"
2. Crea una lista de testers (o usa la predeterminada)
3. Añade emails de las personas que quieres que prueben
4. Comparte el link de opt-in que genera Google

---

## Paso 9: Publicar en producción

Cuando las pruebas internas estén OK:

1. Ve a **Publicación → Producción**
2. Click "Crear nueva versión"
3. Selecciona el AAB de pruebas internas (o sube uno nuevo)
4. Mismas notas de versión
5. Click "Revisar versión"
6. Si hay avisos/errores, resuélvelos (suelen ser del checklist de configuración)
7. Click "Iniciar lanzamiento a producción"

### Tiempos de revisión

- **Primera app:** 3-7 días hábiles (puede tardar más)
- **Updates posteriores:** 1-3 días normalmente
- Google puede rechazar y te dirá el motivo por email

---

## Paso 10: Post-publicación

- [ ] Verificar que la app aparece en Google Play (puede tardar unas horas tras aprobación)
- [ ] Probar la instalación desde el Store en un dispositivo real
- [ ] Configurar "Store listing experiments" para A/B testing (cuando haya tráfico)
- [ ] Monitorizar crashes en Play Console → Android Vitals

---

## Referencia rápida de comandos

```bash
# Build completo para Android
npm run build:android && npx cap sync android

# Abrir en Android Studio
npx cap open android

# Generar AAB por terminal (requiere firma configurada en build.gradle)
cd android && ./gradlew bundleRelease && cd ..

# Output del AAB
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Archivos relacionados

- `docs/play-store-listing.md` — Textos y keywords para el listing
- `store-assets/` — Icono, feature graphic y screenshots
- `capacitor.config.ts` — Config de Capacitor (appId: `com.miplantitafeliz.app`)
