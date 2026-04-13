# Testing

## Comandos

```bash
# Unit tests (Vitest) — lógica de negocio pura
npm run test          # Un solo pase (~1s)
npm run test:watch    # Re-ejecuta al guardar

# E2E tests (Playwright) — flujos de usuario en navegador real
npm run test:e2e      # Chromium (Pixel 7) + WebKit (iPhone 14) (~20s)
npm run test:e2e:ui   # Abre UI visual de Playwright para debug

# Ejecutar solo un archivo o test concreto
npx playwright test e2e/auth.spec.ts
npx playwright test -g "login with valid credentials"

# Ejecutar solo en un browser
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari

# Visual regression — screenshots pixel a pixel
npx playwright test e2e/visual.spec.ts                  # Compara contra baselines
npx playwright test e2e/visual.spec.ts --update-snapshots  # Regenera baselines

# Ver el informe HTML del último run (incluye diffs visuales si algo falló)
npx playwright show-report
```

## Qué cubre cada suite

### Vitest (unit tests)

| Archivo | Qué testea |
|---|---|
| `src/lib/geo-permission.test.ts` | Máquina de estados de consentimiento de ubicación |
| `src/lib/anonymous-id.test.ts` | Generación y persistencia del ID anónimo |
| `src/services/auth.service.test.ts` | Login/signup y traducción de errores a español |
| `src/hooks/use-plant-identifier.test.ts` | Validación de imagen (tipo, tamaño) y estado del hook |

### Playwright (E2E tests)

| Archivo | Qué testea |
|---|---|
| `e2e/smoke.spec.ts` | Home carga, navegación entre tabs, redirect /login, página 404 |
| `e2e/identify.spec.ts` | Subir foto → loading → resultado → reset, error del edge function |
| `e2e/auth.spec.ts` | Auth forms inline, login ok/error, registro, validación, tabs autenticado |
| `e2e/history.spec.ts` | Lista, búsqueda, filtro por mes, expandir tarjeta, editar y borrar |

### Playwright (visual regression)

| Archivo | Qué testea |
|---|---|
| `e2e/visual.spec.ts` | Screenshots pixel-a-pixel de 8 pantallas clave x 2 browsers |

Pantallas con screenshot: home, auth login, auth register, resultado de planta, historial, tarjeta expandida, estado vacío, 404.

Las imágenes de referencia están en `e2e/screenshots/` (una carpeta por browser). Se commitean al repo para que cualquiera pueda detectar regresiones.

```bash
# Regenerar baselines después de un cambio visual intencionado
npx playwright test e2e/visual.spec.ts --update-snapshots
```

Si un test visual falla, Playwright genera un diff en `test-results/` mostrando exactamente qué pixeles cambiaron.

## Error tracking (PostHog)

Check pre-build que consulta PostHog por excepciones no resueltas en producción.

```bash
npm run check:errors                    # ¿Hay errores nuevos en prod?
npm run check:errors -- --acknowledge   # Marcar errores actuales como revisados
```

Requiere `POSTHOG_PERSONAL_API_KEY` como variable de entorno (añádela a `~/.zshrc`).

**Cómo funciona:**
- Consulta las excepciones de los últimos 7 días vía API de PostHog
- Filtra solo producción (excluye localhost)
- Compara contra un baseline local (`scripts/.error-baseline.json`, en `.gitignore`)
- Sale con código 1 si hay errores nuevos no revisados

**Flujo recomendado:**
1. Antes de deployar: `npm run check:errors`
2. Si hay errores nuevos: investigar y arreglar
3. Si el error está resuelto o es aceptado: `npm run check:errors -- --acknowledge`

## Cómo funcionan los mocks E2E

Los tests E2E no llaman a Supabase real. `e2e/fixtures.ts` intercepta las llamadas HTTP:

- **`asAnonymous`** — usuario no logueado, edge function mockeado
- **`asAuthenticated`** — sesión pre-cargada en localStorage, historial mockeado

Para modificar respuestas en un test concreto, usa `page.route()` después del fixture (las rutas más recientes tienen prioridad).
