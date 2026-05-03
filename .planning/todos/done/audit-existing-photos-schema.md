---
title: Auditar el esquema actual de identificaciones en Supabase para diseñar la columna de contexto
date: 2026-05-01
priority: high
blocks: Phase A (Foundations: Classification + Result Actions + Reveal)
type: pre-planning-task
---

# Auditar esquema de identificaciones para añadir contexto

## Por qué

La opción C requiere que cada identificación tenga un atributo de **contexto** (casa / silvestre / sin clasificar) para enrutarla al calendario o al mapa. Esto es una **migración de datos** que afecta a todos los usuarios existentes y a sus identificaciones ya guardadas.

Antes de planificar la fase A (Foundations) hay que entender:

1. **Qué tablas tocan**: la tabla principal de identificaciones, ¿alguna tabla relacionada de "favoritos"/"historial"?
2. **Qué columnas existen hoy**: para saber dónde encaja `context` y si hay algo aprovechable (ej: ¿se guarda ya geolocalización?).
3. **Qué Row Level Security policies aplican**: el cambio no debe romper las RLS por usuario.
4. **Cuántos registros existen** en producción hoy (para dimensionar el coste del backfill a `null` / `sin clasificar`).
5. **Si hay metadatos EXIF guardados** o si las fotos se guardan en Storage con esa info útil para inferencia futura (ver seed `smart-classification-inference`).

## Qué entregar

Un breve documento (puede ser un comentario en la fase A cuando se planifique) que cubra:

- Tabla(s) afectadas
- Esquema actual relevante
- Propuesta de columna nueva: nombre (`context`?, `usage_mode`?), tipo (`text` con CHECK constraint? `enum` de Postgres?), valor por defecto (`'unclassified'` para no romper nada existente)
- Backfill plan: ¿todos los registros viejos quedan como `unclassified` y el usuario los clasifica manualmente desde su detalle?
- Migración: ¿una migración Supabase normal? ¿hay riesgo de downtime con N registros?

## Cómo hacerlo

```bash
# Listar tablas relevantes
supabase db dump --schema public > current-schema.sql

# O revisar las migraciones existentes en
ls supabase/migrations/
```

Y confirmar con la dueña del producto si la columna se llama `context` o algún otro nombre que encaje con el lenguaje del producto en español.

## Estado

**Resuelto: 2026-05-03.** Audit completo en `.planning/phases/02.1-foundations-classification-result-actions-reveal/02.1-SCHEMA-AUDIT.md`. La planificación de Phase 02.1 ya no está bloqueada.
