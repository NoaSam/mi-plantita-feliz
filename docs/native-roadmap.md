# Roadmap: Publicar en Google Play (Android)

Estado actual: PWA funcional desplegada en Vercel. Sin wrapper nativo.
Objetivo: publicar en Google Play manteniendo la PWA activa.
Estrategia: Capacitor como wrapper nativo. Un solo codebase para web + Android.
Prioridad: baja (hay otras tareas más prioritarias). Se trabajará incrementalmente.

---

## Principios

- **La PWA no se apaga.** Las apps nativas son un canal de distribución adicional.
- **Un solo codebase.** Capacitor envuelve la misma web. Las mejoras al código benefician ambos canales.
- **Captación en paralelo.** No parar la adquisición de usuarios en PWA.
- **Incrementalidad.** Cada fase deja la app funcional.

---

## Fase 0: Preparación de cuentas y assets (sin código)

- [ ] Verificar acceso a **Google Play Console** (cuenta prestada)
- [ ] Definir **nombre de la app** en store (puede diferir de "Mi jardín")
- [ ] Redactar **descripción corta** (80 chars) y **larga** (4000 chars) para la ficha
- [ ] Preparar **screenshots** (mínimo 2, recomendado 5-8, formato 16:9 o 9:16)
- [ ] Definir **categoría** (sugerida: "Estilo de vida" o "Educación")
- [ ] Elegir **clasificación de edad** (probablemente Everyone)
- [ ] Preparar **política de privacidad** (URL pública, obligatoria)
- [ ] Crear **icono de app** 512x512 PNG (sin transparencia)

---

## Fase 1: Mejorar assets de la PWA (~medio día)

> Beneficia la PWA actual sin romper nada. Prepara iconos para reusar en la app nativa.

- [ ] Generar set completo de iconos:
  - PWA: 48, 72, 96, 128, 144, 192, 384, 512 px
  - Maskable: 192 y 512 px (con safe zone del 80%)
- [ ] Actualizar manifest en `vite.config.ts` con todos los tamaños
- [ ] Añadir campos `screenshots` y `categories` al manifest

---

## Fase 2: Integrar Capacitor (~medio día)

> Añade la capa nativa sin cambiar código web.

- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npx cap init "Mi jardín" "com.mijardin.app"`
- [ ] Configurar `capacitor.config.ts` con `webDir: "dist"`
- [ ] `npm run build && npx cap add android`
- [ ] `npx cap sync` — copia dist/ al proyecto Android
- [ ] `npx cap open android` — verificar que la app carga en emulador

### Flujo de desarrollo a partir de aquí
```
Cambio en código web → npm run build → npx cap sync → ejecutar en Android Studio
```

---

## Fase 3: Ajustes nativos (~1 día)

> Que la app se sienta nativa, no una web dentro de un marco.

- [ ] Splash screen nativo (`@capacitor/splash-screen`)
- [ ] Barra de estado color `#2D5A27` (`@capacitor/status-bar`)
- [ ] Reemplazar `ic_launcher` con icono propio (usar `capacitor-assets` para generar todas las densidades)
- [ ] Verificar safe areas (notch, barra de navegación)
- [ ] Probar cámara y geolocalización en dispositivo real
- [ ] Configurar orientación portrait en `AndroidManifest.xml`

---

## Fase 4: Publicar en Google Play (~1-2 días + espera de review)

- [ ] **Generar AAB firmado:**
  - Crear keystore: `keytool -genkey -v -keystore mi-jardin.keystore -alias mi-jardin -keyalg RSA -keysize 2048 -validity 10000`
  - IMPORTANTE: guardar el keystore en lugar seguro. Si se pierde, no se puede actualizar la app.
  - Configurar firma en `android/app/build.gradle`
  - Build release en Android Studio: Build > Generate Signed Bundle (AAB)
- [ ] **Subir a Google Play Console:**
  - Crear aplicación nueva
  - Rellenar ficha (nombre, descripción, screenshots, icono)
  - Subir AAB al track "Pruebas internas" primero
  - Configurar clasificación de contenido
  - Añadir política de privacidad
  - Rellenar "Seguridad de los datos" (email, fotos, ubicación, analytics)
- [ ] **Testing interno:**
  - Añadir testers por email (hasta 100, sin review formal)
  - Probar: cámara, geolocalización, login, historial
- [ ] **Publicar en producción:**
  - Pasar de "Pruebas internas" a "Producción"
  - Primera review: 3-7 días típicamente

---

## Fase 5: Post-lanzamiento

- [ ] Smart banner en la PWA que sugiera instalar desde Google Play
- [ ] Push notifications nativas (`@capacitor/push-notifications`)
- [ ] Actualizaciones OTA con Capgo (actualizar web sin pasar por review)
- [ ] Monitorizar y responder reviews

---

## Estimación total

| Fase | Esfuerzo |
|------|----------|
| 0. Cuentas y assets | 1-2 días (gestión) |
| 1. Assets PWA | Medio día |
| 2. Capacitor | Medio día |
| 3. Ajustes nativos | 1 día |
| 4. Publicar | 1-2 días + review |
| 5. Post-lanzamiento | Continuo |

**~4-5 días de trabajo efectivo** hasta tener la app en Google Play.

---

## Futuro: iOS

Cuando se valide en Android, repetir con iOS:
- Requiere cuenta Apple Developer ($99/año) y Mac con Xcode
- `npx cap add ios` genera el proyecto iOS
- Review de Apple más estricta (exige funcionalidad nativa real — cámara y geo ayudan)
- TestFlight para testing antes de publicar
