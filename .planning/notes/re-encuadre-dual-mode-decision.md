---
title: Re-encuadre del producto a dos modos de uso (casa / explorar)
date: 2026-05-01
context: Exploración estratégica antes de planificar Phase 4 (originalmente Onboarding)
type: decision-note
---

# Re-encuadre dual-mode: casa / explorar

## El cambio

La app pasa de "identificador universal de plantas" a un producto con **dos contextos de uso** que pueden coexistir en el mismo usuario:

- **Exploratorio** — paseo por ciudad, parque, campo. El usuario quiere saber qué planta es. La feature extra es un **mapa de plantas** (descubrimientos geolocalizados).
- **En casa** — plantas propias del usuario. La feature extra es el **calendario de riego**.
- **Mixto** — un mismo usuario hace ambas cosas. Debe ser nativo, no un "modo ambos" forzado.

## La decisión clave: ¿cuándo se declara el contexto?

Tres opciones evaluadas:

- **A) Elige al onboarding (perfil de usuario)** — descartada. Pide al usuario decidir antes de tener contexto. La opción "ambos" siempre es un default falso. Quien elige mal queda con la app capada.
- **B) Inferido por GPS / EXIF** — descartada para v1. Mágico cuando funciona, frustrante cuando falla. Requiere calibración con datos que aún no tenemos.
- **C) La acción crea el modo** — **ELEGIDA**. No hay decisión abstracta de modo. Tras identificar una planta, el resultado ofrece 3 acciones que la etiquetan implícitamente: *Añadir a mis plantas* / *Guardar descubrimiento* / *Solo identificar*. El calendario aparece cuando hay ≥1 planta de casa. El mapa aparece cuando hay ≥1 descubrimiento. Mixto es el comportamiento natural, no un modo.

Patrón equivalente: Strava (no eliges si eres runner o ciclista; lo decides al subir cada actividad).

## Implicaciones derivadas

1. **La home minimalista actual está alineada con C** — no hay que tocarla para usuarios nuevos. La acción de cámara es la entrada única.
2. **"Phase 4: Onboarding" como pantallas de intro deja de tener sentido** — el onboarding se distribuye en momentos contextuales (result screen, empty states de calendario/mapa, permisos contextuales).
3. **Phase 4 sí tiene un trabajo real, pero distinto:** la **transición/reveal para usuarios existentes** que tienen historial sin clasificar. Sin un reveal explícito, los usuarios actuales nunca descubren las nuevas features.
4. **Aparece una fase nueva: Plant Map** (extra del modo explorador). No estaba en el roadmap original. La base técnica ya existe (ANDR-04 = permiso de geolocalización en Phase 1).
5. **Phase 3 (Watering Calendar) se rebaja** de "feature estrella universal" a "extra condicional del modo casa". Solo aparece en home si hay ≥1 planta guardada.
6. **Modelo de datos:** cada identificación necesita un atributo de contexto (casa / silvestre / sin clasificar) para enrutarla correctamente.

## Qué NO se decide aquí

- El alcance exacto de cada nueva fase (se discutirá en `/gsd-spec-phase` por fase).
- El diseño visual de las 3 acciones, calendario v0, mapa v0 (se trabajará en `/gsd-sketch` por superficie).
- Cómo migrar el historial existente sin contexto (banner pasivo vs clasificación batch — se decide en la fase de Foundations / Reveal).
