# 03 · Rutas de la aplicación

La interfaz usa **páginas con `load`** (lectura) y ***form actions*** (escritura). Solo hay endpoints `+server.ts` para lo que no es HTML: ficheros, CSV y salud.

Leyenda de acceso: 🌐 pública · 👤 con sesión · 💼 tesorero.

## Acceso

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/entrar` | 🌐 | acción `default`: teléfono + contraseña | HU-A02 |
| `/salir` | 👤 | acción `default` (POST, nunca GET) | HU-A03 |
| `/activar?codigo=…` | 🌐 | acción `default`: teléfono + código + contraseña | HU-A01 |
| `/restablecer` | 🌐 | acción `solicitar` (envía el email) | HU-A04 |
| `/restablecer/[codigo]` | 🌐 | acción `default`: contraseña nueva | HU-A04 |
| `/cuenta` | 👤 | acción `cambiarContrasena` | HU-A03 |

## Socio (y tesorero como socio)

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/` | 👤 | Redirige a `/tickets` (socio) o a `/gestion/tickets` (tesorero) | — |
| `/tickets` | 👤 | `load`: mis tickets + totales; filtro `?estado=pendientes\|rechazado\|pagado\|anulado` («pendientes» agrupa los dos pendientes); `?enviado=<número>` y `?bienvenida` muestran un aviso | HU-S02 |
| `/tickets/nuevo` | 👤 | acción `default` (multipart) | HU-S01 |
| `/tickets/[numero]` | 👤 (propio; 404 si es ajeno, también para un tesorero) | `load`: detalle + ficheros vigentes + historial; acciones `anular`, `reenviar` (Sprint 2) | HU-S03, S05, S06 |
| `/tickets/[numero]/editar` | 👤 (propio) | acción `default` (multipart, con `version`) | HU-S04, S06 |

## Gestión (tesorero)

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/gestion/tickets` | 💼 | `load` con `?estado=&concepto=&socio=&desde=&hasta=&min=&max=&orden=&dir=&pagina=`; totales | HU-T01 |
| `/gestion/tickets.csv` | 💼 | `GET` `+server.ts`, mismos parámetros | HU-T07 |
| `/gestion/tickets/[numero]` | 💼 | `load`; acciones `autorizar`, `rechazar`, `deshacer` (con `version`) | HU-T02–T04, T06 |
| `/gestion/pagos/nuevo?socio=…` | 💼 | `load`: tickets pendientes de pago del socio; acción `default` (multipart, justificante opcional) | HU-T05 |
| `/gestion/pagos/[id]` | 💼 | `load`: detalle del pago y sus tickets; acción `deshacer` | HU-T05, T06 |
| `/gestion/usuarios` | 💼 | `load`: listado con estado; acción `alta` (alta + email), con el formulario en la misma página, como en el boceto | HU-G01, G03 |
| `/gestion/usuarios/[id]` | 💼 | acciones `guardar`, `reenviarInvitacion`, `baja`, `reactivar` | HU-G02, G03 |
| `/gestion/conceptos` | 💼 | `load` con `?editar=<id>` (renombrar en su fila, también sin JavaScript); acciones `crear`, `renombrar`, `subir`, `bajar`, `activar`, `desactivar`. No hay borrado: un concepto se desactiva | HU-G04 |

## Endpoints

| Ruta | Acceso | Descripción |
|---|:-:|---|
| `GET /ficheros/[id]` | 👤 propio o 💼 | Fichero de ticket. 404 si no hay permiso (R-01). `Content-Disposition: inline` con el nombre original (extensión real), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` |
| `GET /justificantes/[pagoId]` | 👤 propio o 💼 | Justificante de pago |
| `GET /salud` | 🌐 (local) | `200` si la base de datos responde. Para el `healthcheck` de Docker |

## Notas

- **En la URL se usa `numero`** (`/tickets/123`), no el UUID. Como el acceso se comprueba en cada petición, que sea predecible no es un problema de seguridad (R-01: 404 si no es tuyo).
- **Todas las acciones que cambian estado envían `version`** (concurrencia optimista, E-04).
- **Cabeceras de seguridad** en `hooks.server.ts`: `Content-Security-Policy` (`kit.csp` de SvelteKit en modo *nonce*), `Referrer-Policy: same-origin`, `Permissions-Policy: camera=(self)` y `X-Frame-Options: DENY`.
