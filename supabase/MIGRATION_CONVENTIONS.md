# Convenciones de migraciones — Supabase

## Por qué este doc existe

Supabase anunció (mayo 2026) que **a partir del 30 de octubre de 2026** las tablas nuevas en el schema `public` ya **no se exponen automáticamente** al Data API (`supabase-js`, REST `/rest/v1/`, GraphQL). Hay que añadir `GRANT` explícitos.

- **Tablas existentes** (las creadas antes de oct 2026): siguen funcionando, no hay que migrar nada.
- **Tablas nuevas** (cualquier migración nueva): necesitan `GRANT` explícitos o quedarán inaccesibles desde `supabase-js`.

Si falta el GRANT, PostgREST devuelve el error `42501` con el `GRANT` exacto que falta — útil para diagnóstico, pero mejor evitarlo en primer lugar.

## Boilerplate para nuevas migraciones que crean tablas

Toda migración que haga `create table public.X` debe seguir este orden:

```sql
-- 1) Crear tabla
create table public.nueva_tabla (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  -- ... resto de columnas
  created_at timestamptz default now()
);

-- 2) GRANTs explícitos (REQUIRED a partir de oct 2026)
grant select, insert, update, delete on public.nueva_tabla to authenticated;
grant select, insert, update, delete on public.nueva_tabla to service_role;
-- Solo si la tabla debe ser leída por usuarios anónimos:
-- grant select on public.nueva_tabla to anon;

-- 3) RLS (obligatorio en todo el proyecto — datos por usuario)
alter table public.nueva_tabla enable row level security;

-- 4) Políticas RLS (mínimo una por operación que el rol pueda hacer)
create policy "users can manage own rows"
  on public.nueva_tabla
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Notas sobre los roles

| Rol | Cuándo grantear | Ejemplo |
|---|---|---|
| `authenticated` | Siempre, para tablas de datos de usuario | `plant_searches`, `profiles`, futura `watering_schedule` |
| `service_role` | Siempre (las edge functions y scripts admin lo usan) | Todas las tablas |
| `anon` | Solo si la lectura anónima es parte del producto | Búsquedas anónimas pre-login en el patrón actual |

**No grantear `to public`** (es el rol "todo el mundo incluido no-autenticados sin claim"). Usar `anon` cuando se quiera permitir explícitamente acceso sin sesión.

## Para migraciones que NO crean tablas (alter, índices, datos)

Sin cambios. El nuevo default solo afecta a `CREATE TABLE`.

## Para storage buckets

Sin cambios. Los buckets tienen su propio sistema de policies (`storage.objects` + bucket policies). Ya está cubierto en `20260422000000_create_plant_images_bucket.sql`.

## Cómo verificar que una migración está bien grant-eada

Tras correrla en local (`supabase db reset` o `supabase migration up`):

```sql
-- Lista los privilegios de la tabla
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'nueva_tabla'
order by grantee, privilege_type;
```

Deberías ver entradas para `authenticated` y `service_role`. Si solo aparece el `owner` (el role que creó la tabla), faltan los GRANTs.

## Tablas existentes del proyecto (estado actual, oct 2026)

| Tabla | Migración original | Estado |
|---|---|---|
| `plant_searches` | `20260404000000_create_plant_searches.sql` | Sin GRANT explícito — protegida por la cláusula de "existing tables keep their current grants" |
| `profiles` | `20260405100000_create_profiles.sql` | Idem |
| `model_evaluations` | `20260407000000_create_model_evaluations.sql` | Idem |

Todas siguen funcionando vía `supabase-js`. No tocar las migraciones históricas (cambiarlas no afecta producción, solo el `db reset` local).

## Rollout dates (referencia)

| Fecha | Cambio |
|---|---|
| 30 mayo 2026 | Nuevos proyectos Supabase adoptan el nuevo default (este proyecto NO es nuevo) |
| 30 octubre 2026 | Enforcement en proyectos existentes — desde aquí los `CREATE TABLE` sin GRANT fallan silenciosamente para el Data API |

Más info: [Supabase Security Advisor en el dashboard del proyecto](https://supabase.com/dashboard) — sección "Security Advisor" detecta tablas que cumplen / no cumplen.
