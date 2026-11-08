# 03 · Rutas de la aplicación

La interfaz usa **páginas con `load`** (lectura) y ***form actions*** (escritura). Solo hay endpoints `+server.ts` para lo que no es HTML: ficheros, CSV y salud.

Leyenda de acceso: 🌐 pública · 👤 con sesión · 💼 tesorero.

## Acceso

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/entrar` | 🌐 | acción `default`: teléfono + contraseña | HU-A02 |
| `/salir` | 👤 | acción `default` (POST, nunca GET) | HU-A03 |
| `/activar?codigo=…` | 🌐 | acción `default`: teléfono + código + contraseña. Vale para un invitado y, con un código reenviado por un tesorero, para un activo: cambia la contraseña y cierra sus sesiones | HU-A01, G02 |
| `/restablecer` | 🌐 | acción `solicitar` (envía el email) | HU-A04 |
| `/restablecer/[codigo]` | 🌐 | acción `default`: contraseña nueva | HU-A04 |
| `/cuenta` | 👤 | acción `cambiarContrasena` | HU-A03 |

## Socio (y tesorero como socio)

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/` | 👤 | Redirige a `/tickets` (socio) o a `/gestion/tickets` (tesorero) | — |
| `/tickets` | 👤 | `load`: mis tickets + totales; filtro `?estado=pendientes\|rechazado\|pagado\|anulado` («pendientes» agrupa los dos pendientes); `?enviado=<número>` y `?bienvenida` muestran un aviso | HU-S02 |
| `/tickets/nuevo` | 👤 | acción `default` (multipart) | HU-S01 |
| `/tickets/[numero]` | 👤 (propio; 404 si es ajeno, también para un tesorero) | `load`: detalle + ficheros vigentes + historial; acción `anular` (confirmación en la página; 409 si cambió, E-04); `reenviar` va en `/editar` | HU-S03, S05, S06 |
| `/tickets/[numero]/editar` | 👤 (propio; si ya no se puede editar, redirige al detalle) | `load`: datos y ficheros vigentes; acción `default` (multipart, con `version` y los ids en `quitar`). Pendiente: edita; rechazado: corrige y reenvía. Vuelve al detalle con `?guardado` o `?reenviado`; 409 si un tesorero lo cambió (E-04) | HU-S04, S06 |

## Gestión (tesorero)

| Ruta | Acceso | `load` / acciones | Historia |
|---|:-:|---|---|
| `/gestion/tickets` | 💼 | `load` con `?estado=&concepto=&socio=&desde=&hasta=&min=&max=&orden=&dir=&pagina=` (`estado` se repite; sin `estado`, solo los pendientes de autorizar, y `estado=todos` para todos; `concepto=otro` para el texto libre; `desde`/`hasta` sobre la fecha de compra; un valor que no se entiende se ignora); por cada estado, lo que hay con los demás filtros (son el filtro rápido de estado); 50 por página. Si hay pendientes con más de 18 meses, un aviso con enlace a ellos (la purga no los borra) | HU-T01, G05 |
| `/gestion/tickets.csv` | 💼 | `GET` `+server.ts`, mismos parámetros y orden que el listado, sin paginar (botón «Exportar CSV»). Para Excel en español: `;`, coma decimal, UTF-8 con BOM y CRLF. El teléfono va sin el `+34` y los textos que empiezan por `= + - @` llevan un apóstrofo delante (inyección CSV) | HU-T07 |
| `/gestion/tickets/[numero]` | 💼 | `load`; acciones `autorizar`, `rechazar` y `deshacer` (autorización o rechazo, con motivo), todas con `version`. Deshacer un pago se hace en `/gestion/pagos/[id]` | HU-T02–T04, T06 |
| `/gestion/pagos` | 💼 | `load`: socios con tickets pendientes de pago (sin los del propio tesorero, R-04) y últimos pagos | HU-T05 |
| `/gestion/pagos/nuevo?socio=…&ticket=…` | 💼 | `load`: tickets pendientes de pago del socio, todos marcados (o solo `ticket`, si se viene del detalle); acción `default` (multipart, justificante opcional; cada ticket con su versión, E-04). Vuelve a `/gestion/pagos/[id]?registrado` | HU-T05 |
| `/gestion/pagos/[id]` | 💼 | `load`: detalle del pago y sus tickets (del historial, para que sigan tras deshacerlo); acción `deshacer` (con motivo; el pago completo, E-03) | HU-T05, T06 |
| `/gestion/usuarios` | 💼 | `load`: listado con estado (cada nombre enlaza a su ficha); acción `alta` (alta + email), con el formulario en la misma página, como en el boceto | HU-G01, G03 |
| `/gestion/usuarios/[id]` | 💼 | `load`: la ficha, con aviso si tiene los datos ficticios del tesorero inicial (R-06); acciones `guardar` (datos y roles, R-03), `reenviar` (código nuevo de 7 días y su enlace para copiar; a un usuario activo le sirve para elegir otra contraseña), `baja` (confirmada en la página; nadie se da de baja a sí mismo; R-03, R-05) y `reactivar`. Sin control de versión: si dos tesoreros editan a la vez, gana el último | HU-G02, G03 |
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
- **Cabeceras de seguridad**: `Content-Security-Policy` con *nonce* (`kit.csp` en `vite.config.ts`, ADR-0003) y, en `hooks.server.ts`, `Referrer-Policy: same-origin`, `Permissions-Policy: camera=(self)`, `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`.
