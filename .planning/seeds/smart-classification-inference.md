---
title: Inferencia inteligente del contexto de identificación (casa / silvestre)
trigger_condition: Cuando haya ≥100 identificaciones clasificadas manualmente en producción Y se observen patrones claros de fricción en la clasificación manual
planted_date: 2026-05-01
type: future-feature-seed
---

# Smart classification inference

## La idea

Hoy la clasificación es 100% manual: tras identificar una planta, el usuario elige *Mi jardín* / *Descubrimiento* / *Solo identificar*. Funciona bien porque el usuario tiene la información en el momento (sabe si está en su salón o en un parque).

Cuando tengamos suficientes datos, podemos **inferir el contexto automáticamente** y proponer la clasificación, dejando al usuario solo confirmar o corregir.

## Señales disponibles para inferir

- **GPS** — si la coordenada está cerca de la ubicación habitual del usuario (¿hay home location?), probablemente es casa. Si está lejos, probablemente es descubrimiento.
- **EXIF de la foto** — algunas cámaras embeben metadatos de iluminación que distinguen interior/exterior.
- **Histórico del usuario** — si ya tiene 10 plantas clasificadas como casa en una zona GPS concreta, una nueva foto en esa zona probablemente también es casa.
- **Hora del día** — fotos de día con mucha luz natural y geolocalización exterior → silvestre. Fotos de noche con luz artificial → casa.
- **Modelo de IA** — el modelo de identificación podría detectar contexto visual (¿hay maceta? ¿hay pared? ¿hay hierba alrededor?).

## Por qué hoy es prematuro

- No hay suficientes identificaciones clasificadas para entrenar / calibrar inferencia.
- El comportamiento del usuario en producción aún no se conoce (¿clasifica siempre? ¿ignora la opción "Solo identificar"?).
- Inferencia errónea es peor que pedir explícitamente: si la app sugiere "casa" cuando es silvestre, el usuario tiene que corregir Y sentir que la app no le entiende.

## Cuándo retomarlo

Reactivar este seed cuando:
1. Haya ≥100 identificaciones clasificadas manualmente en producción.
2. Se observen patrones claros: por ejemplo, que el GPS coincida >80% con la clasificación manual, indicando que la inferencia sería precisa.
3. O al revés: que la fricción de la clasificación manual aparezca en feedback de usuarios ("¿por qué tengo que decir esto cada vez?").

## Forma posible cuando llegue el momento

- La clasificación manual se mantiene como override.
- La app pre-selecciona la opción inferida con confianza (≥80%).
- Si confianza es baja, no infiere y deja al usuario elegir.
- Métrica de éxito: % de inferencias aceptadas sin corrección.
