# Manual del desarrollador

Este manual explica cómo trabajar en el código: el entorno local, las pruebas, cómo se añade una historia y el camino de un cambio hasta producción. No repite lo que ya está en otros documentos, sino que enlaza a ellos:

- [Requisitos](requisitos/README.md): historias, reglas (R-xx) y la definición de terminado ([06-backlog.md](requisitos/06-backlog.md)).
- [Arquitectura](arquitectura/README.md): C4, modelo de datos, rutas y los ADR, que explican el porqué de cada decisión.
- [Estructura y convenciones](arquitectura/04-estructura.md): dónde va cada cosa y las reglas del código. **Léelo antes de escribir código.**
- [Manual de administrador](../deploy/README.md): la instalación y la operación en la máquina.
- [Manuales](manual/README.md): cómo regenerar la Ayuda, sus capturas y los PDF.

## 1. Entorno local

Hace falta Node 24, pnpm (`corepack enable`) y Docker. Docker se usa con `sudo`, solo para el PostgreSQL de desarrollo.

```bash
pnpm install
cp .env.example .env
sudo docker compose -f deploy/compose.dev.yaml up -d   # PostgreSQL 18 en 127.0.0.1:5436 (eql4e/eql4e)
pnpm db:migrar
pnpm dev                                               # http://localhost:5173
```

La primera vez no hay ningún tesorero. Al arrancar, la app crea uno con datos ficticios y escribe en la consola un enlace para activarlo (R-06, `src/hooks.server.ts`). Ábrelo, pon una contraseña y desde ahí podrás dar de alta socios. Con `CORREO_MODO=consola` los correos de invitación y restablecimiento no se envían: se escriben en la consola con su enlace.

### Bases de datos

Todas viven en el mismo PostgreSQL de desarrollo:

| Base | Para qué | Quién la crea |
|---|---|---|
| `eql4e` | `pnpm dev` | `compose.dev.yaml` |
| `eql4e_prueba_<marca>` | Pruebas de integración: una nueva en cada ejecución, que se borra al terminar | `tests/integracion/preparar.ts`, a partir de `TEST_DATABASE_URL` |
| `eql4e_e2e` | Pruebas e2e. Se migra y se rellena al empezar, pero no se vacía | Tú, una vez |
| `eql4e_manual` | Capturas de la Ayuda. **Se vacía entera** cada vez, y el guion se niega a usar una base cuyo nombre no acabe en `_manual` | Tú, una vez |

```bash
sudo docker compose -f deploy/compose.dev.yaml exec db createdb -U eql4e eql4e_e2e
sudo docker compose -f deploy/compose.dev.yaml exec db createdb -U eql4e eql4e_manual
```

## 2. Pruebas

| Tipo | Dónde | Comando |
|---|---|---|
| Unitarias: lógica pura, sin base de datos | Junto al código (`estados.test.ts`) | `pnpm test:unit` (modo vigilancia) |
| Integración: el dominio contra PostgreSQL real | `tests/integracion/` | `pnpm test:integracion` |
| e2e: la app compilada, en perfiles móvil y escritorio | `tests/e2e/*.e2e.ts` | `pnpm test:e2e` |

```bash
# Integración. Sin TEST_DATABASE_URL usa Testcontainers, que necesita Docker sin sudo, como en la CI.
TEST_DATABASE_URL=postgres://eql4e:eql4e@127.0.0.1:5436/postgres pnpm test:integracion

# e2e: se ejecutan contra build/, así que primero hay que compilar
pnpm build
DATABASE_URL=postgres://eql4e:eql4e@127.0.0.1:5436/eql4e_e2e pnpm test:e2e
pnpm exec playwright show-report   # si algo falla: traza y capturas
```

Algunos detalles:

- **Integración.** Cada fichero abre su conexión con `conexionDePrueba()` (`tests/integracion/conexion.ts`) y crea sus datos con `tests/integracion/datos.ts`. Todos los ficheros comparten la base, así que cada prueba usa teléfonos y nombres propios. Si una prueba toca algo compartido, como la lista de conceptos, lo hace dentro de una transacción que deshace al final (mira `conceptos.test.ts`).
- **e2e.** Los datos fijos están en `tests/e2e/datos.ts`: un juego **por perfil** (`movil`, `escritorio`), porque los dos perfiles se ejecutan en paralelo sobre la misma base. `preparar.ts` los inserta directamente con SQL. Cada prueba importa `test` y `expect` de `tests/e2e/base.ts`, no de `@playwright/test`.
- **Orden de arranque.** Playwright levanta el servidor (`node build`) **antes** de ejecutar el `globalSetup`. Por eso la app no puede depender, al arrancar, de datos que cree `preparar.ts`.
- **Puerto ocupado.** En local, Playwright reutiliza un servidor que ya escuche en el puerto 4173. Si las e2e se comportan raro, comprueba que no quede uno antiguo de otra compilación.
- **Cobertura.** `pnpm test:cobertura` exige el 100 % de ramas en la máquina de estados, los permisos, la autenticación, los usuarios y los conceptos (ADR-0007). Los umbrales están en `vite.config.ts`.

Antes de subir nada, ejecuta lo mismo que la CI:

```bash
pnpm lint && pnpm check && pnpm test:unit --run
```

## 3. Receta: añadir una historia

Un ejemplo pequeño y completo es la gestión de conceptos (HU-G04). Síguelo como plantilla:

| Paso | Ejemplo en HU-G04 |
|---|---|
| 1. **Esquema y migración.** Edita `infra/db/esquema.ts`, ejecuta `pnpm db:generate`, **revisa** el SQL de `drizzle/` y súbelo junto con el esquema. No uses `drizzle-kit push`. | `concepto` en `esquema.ts` |
| 2. **Validación compartida.** Esquema Zod en `src/lib/esquemas/`, que usan el formulario y el servidor, con sus pruebas unitarias al lado. | `esquemas/concepto.ts` y `concepto.test.ts` |
| 3. **Dominio.** Funciones que reciben `conexion: Conexion` como primer argumento y devuelven un resultado tipado (`{ ok: true } \| { ok: false; motivo }`) en vez de lanzar excepciones. Si usas `$app/*` o `infra/` (salvo `esquema` y `tipos`), ESLint falla. Los permisos se comprueban aquí, no solo en la ruta. | `dominio/concepto/gestion.ts` |
| 4. **Prueba de integración** del dominio, con los casos de error y de concurrencia que importen. | `tests/integracion/conceptos.test.ts` |
| 5. **Ruta.** `+page.server.ts` con `load` y `actions`, Superforms (`superValidate(request, zod4(esquema))`), `fail(400, { form })` si el formulario no es válido y `setError` para los motivos del dominio. Usa la conexión de `infra/db/app.ts`. La página, en `+page.svelte` con runes. | `routes/gestion/conceptos/` |
| 6. **Acceso.** Una ruta nueva exige sesión salvo que esté en `RUTAS_PUBLICAS` (`hooks.server.ts`). Todo lo que cuelga de `/gestion` devuelve 404 a quien no es tesorero (R-01). | — |
| 7. **e2e.** Datos por perfil en `datos.ts` y `preparar.ts`, y la prueba recorre la historia como lo haría el usuario, buscando por rol y por texto visible (`getByRole`, `getByLabel`). | `tests/e2e/conceptos.e2e.ts` |
| 8. **Documentación.** Si cambia el comportamiento: requisitos, [03-rutas.md](arquitectura/03-rutas.md), la Ayuda (`/ayuda` o `/ayuda/tesoreros`, con sus capturas) y, si toca a la operación, `deploy/README.md`. | — |

Además, ten en cuenta lo siguiente:

- **Variables de entorno.** Se declaran y validan en `src/env.ts`, se leen con `import { … } from '$app/env/private'`, se documentan en `.env.example` y en `deploy/.env.example`, y se añaden a la tabla del §7 de `deploy/README.md`.
- **Tareas programadas.** Se programan en `src/hooks.server.ts` con `programar()` (`infra/tareas.ts`), que usa croner y un *advisory lock* para que la tarea se ejecute una sola vez. Añádelas también a la tabla «Tareas programadas» del manual de administrador.
- **Correo y ficheros.** El dominio no envía correos ni escribe en disco: devuelve los datos o recibe el puerto (`Almacen`) por parámetro (ver las convenciones de [04-estructura.md](arquitectura/04-estructura.md)).
- **Seguridad.** La CSP (`vite.config.ts`) solo permite recursos de la propia app: nada de CDN, ni estilos o scripts en línea sin nonce. Las respuestas de autenticación no deben dejar adivinar si un teléfono existe, ni por el contenido ni por el tiempo de respuesta (ver HU-A04 en `web/restablecimiento.ts`).

## 4. Del cambio a producción

1. **Rama y PR.** Nunca se trabaja directamente en `main`. Una historia o una deuda va en un PR, con mensajes de commit al estilo *Conventional Commits* en español (`feat: …`, `fix: …`, `docs: …`). Si un PR depende de otro, se apila y, antes de integrar el de abajo, se cambia la base del de arriba a `main`. No se hace *force-push*.
2. **CI** ([.github/workflows/ci.yml](../.github/workflows/ci.yml), ADR-0007). En cada PR se ejecutan lint, tipos, la comprobación de que las migraciones están al día con el esquema, las pruebas unitarias y de integración con cobertura, la compilación y las e2e. Si fallan las e2e, el informe de Playwright queda como artefacto del *run*. También se audita las dependencias de producción (`pnpm audit --audit-level high`).
3. **Integrar.** Squash merge en `main`, solo con la CI en verde.
4. **Imagen.** Cada push a `main` con la CI en verde publica `ghcr.io/luislozano/eql4e-tickets:latest` y una etiqueta con el SHA corto.
5. **Despliegue.** Se hace a mano en la máquina, por lotes: `cd /opt/eql4e-tickets && sudo ./desplegar.sh`. Las migraciones se aplican solas al arrancar el contenedor (`docker-entrypoint.sh` → `scripts/migrar.js`). Si cambia algo de `deploy/` (scripts, unidades, compose), hay que copiarlo a la máquina: lo explica el [manual de administrador](../deploy/README.md).
6. **Verificación.** Se sigue el [protocolo de prueba final](pruebas/protocolo.md) en producción, con copia de seguridad antes y restauración al final.

### Dependencias

Dependabot ([.github/dependabot.yml](../.github/dependabot.yml)) abre los PR los lunes, agrupando las versiones menores y los parches en dos grupos, desarrollo y producción. Las versiones mayores de Node, PostgreSQL, `postgres.js` y `@types/node` se deciden a mano.

Una versión no se integra hasta que lleva publicada **unas dos semanas**: así hay tiempo de que se detecten paquetes comprometidos o regresiones. Las dependencias sensibles (`croner`, `nodemailer`, `sharp`, `marked`) van fijadas a una versión exacta.
