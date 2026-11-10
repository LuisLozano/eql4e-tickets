# 04 · Estructura del repositorio

```
eql4e-tickets/
├── .github/
│   ├── workflows/ci.yml            # lint, pruebas, e2e, imagen a GHCR (ADR-0007)
│   └── dependabot.yml
├── docs/
│   ├── desarrollo.md               # manual del desarrollador
│   ├── requisitos/                 # Tarea 1
│   ├── arquitectura/               # Tarea 2 (este documento) + adr/
│   ├── diseno/                     # Tarea 3: bocetos
│   ├── pruebas/protocolo.md        # protocolo de prueba final, manual, en producción
│   └── manual/                     # cómo se generan la Ayuda y los PDF (D-01)
├── deploy/
│   ├── compose.yaml                # app + db (ADR-0006)
│   ├── .env.example                # variables documentadas, sin secretos
│   ├── compose.dev.yaml            # PostgreSQL de desarrollo (127.0.0.1:5436)
│   ├── Caddyfile.snippet           # bloque para el Caddy existente
│   ├── desplegar.sh                # pull + up -d + espera a healthy
│   ├── copia.sh · restaurar.sh     # copias en los discos interno y externo (ADR-0008)
│   ├── eql4e-copia.service · .timer # copia diaria a las 19:30 (systemd)
│   └── README.md                   # manual de administrador (y su PDF)
├── scripts/
│   ├── migrar.js                   # aplica las migraciones (entrypoint y pruebas)
│   └── manual-administrador.js     # deploy/README.md → PDF (pnpm manual:admin)
├── drizzle/                        # migraciones SQL generadas y versionadas
├── src/
│   ├── hooks.server.ts             # sesión, guardas, cabeceras
│   ├── app.d.ts                    # tipo de locals.usuario
│   ├── lib/
│   │   ├── componentes/            # UI propia + shadcn-svelte (ui/); CamposTicket: formulario de enviar y editar
│   │   ├── esquemas/               # Zod compartido cliente/servidor
│   │   ├── cliente/                # compresión de fotos (web worker), fotos elegidas (fotos.svelte.ts), borrador en IndexedDB
│   │   ├── estados.ts              # presentación de los estados: color, icono y texto
│   │   ├── formato.ts              # importes, fechas (Intl es-ES), hoy en Madrid
│   │   ├── importe.ts              # «23,45» → céntimos
│   │   ├── pagos.ts                # métodos de pago y cómo se muestran
│   │   ├── telefono.ts             # teléfonos en E.164
│   │   ├── listado-tickets.ts      # filtros, orden y página del listado global en la URL (HU-T01)
│   │   └── server/
│   │       ├── dominio/
│   │       │   ├── auth/           # sesiones, contraseñas, códigos, limitador
│   │       │   ├── ticket/
│   │       │   │   ├── consultas.ts # mis tickets, detalle y acceso a ficheros (HU-S02, S03)
│   │       │   │   ├── crear.ts    # enviar ticket (HU-S01) y el puerto Almacen
│   │       │   │   ├── editar.ts   # editar (HU-S04) y corregir y reenviar (HU-S06)
│   │       │   │   ├── listado.ts  # listado global con totales (HU-T01)
│   │       │   │   ├── estados.ts  # tabla de transiciones, R-04 y acciones posibles (pura)
│   │       │   │   ├── permisos.ts # R-01, R-04 (puro)
│   │       │   │   └── servicio.ts # cambiar de estado: versión (E-04), transición e historial
│   │       │   ├── pago/       # registrar (HU-T05), deshacer (HU-T06, E-03) y consultas
│   │       │   ├── usuario/        # alta, listado y ficha, gestión (editar, baja, reactivar, reenviar), texto de la invitación
│   │       │   ├── concepto/
│   │       │   ├── ficheros/       # huérfanos: en el disco sin ticket ni pago; puerto AlmacenListable
│   │       │   └── purga/          # tickets de más de 18 meses y aviso de pendientes antiguos (HU-G05)
│   │       ├── infra/
│   │       │   ├── db/             # esquema Drizzle, cliente (los datos iniciales van en migraciones)
│   │       │   ├── almacenamiento/ # disco.ts (volumen: guardar, leer, borrar, listar) y app.ts (lee RUTA_FICHEROS)
│   │       │   ├── correo/         # cliente.ts (SMTP | consola) y app.ts (lee el entorno)
│   │       │   ├── ficheros.ts     # tipo real (file-type) y recodificación (sharp)
│   │       │   └── tareas.ts       # croner y advisory lock: programar y ejecutar en exclusiva (ADR-0006)
│   ├── env.ts                      # variables de entorno validadas con Zod (defineEnvVars de SvelteKit 3)
│   ├── lib/server/web/             # ayudas de la capa SvelteKit: cookie de sesión, limitadores, enlaces, CSV, envío de invitaciones y restablecimientos
│   └── routes/                     # ver 03-rutas.md
├── static/                         # iconos y manifiesto PWA; ayuda/: capturas e ilustraciones de la Ayuda
├── tests/
│   ├── integracion/                # Vitest + Testcontainers
│   ├── e2e/                        # Playwright
│   └── manual/                     # capturas y PDF de la Ayuda, con datos de demostración
├── playwright.config.ts · playwright.manual.config.ts
├── Dockerfile · docker-entrypoint.sh
├── .env.example                    # variables de desarrollo
├── package.json · pnpm-lock.yaml
└── README.md
```

## Convenciones

- **Código en español** en el dominio (`autorizarTicket`, `registrarPago`), para que coincida con los requisitos. Los términos técnicos del framework se mantienen en inglés (`load`, `actions`, `hooks`).
- **Pruebas unitarias junto al código** (`estados.test.ts`); las de integración y e2e, en `tests/`.
- **Configuración validada al arrancar** (`src/env.ts`, con `defineEnvVars` de SvelteKit 3 y Zod): si falta una variable obligatoria, la app no arranca y lo dice claramente. Se leen con `import { DATABASE_URL } from '$app/env/private'`.
- **La conexión se pasa como parámetro, no se importa.** No existe `@Transactional`: una transacción es un *callback* (`db.transaction(async (tx) => …)`) y dentro solo vale `tx`. Por eso los servicios de dominio reciben `conexion: Conexion` (`Db | Tx`, en `infra/db/tipos.ts`) como primer argumento, y así pueden formar parte de la transacción de quien los llama. También permite que las pruebas de integración usen su propia base de datos y que los scripts no dependan de SvelteKit.
  - `infra/db/cliente.ts`: `crearConexion(url)`, sin leer variables de entorno.
  - `infra/db/app.ts`: la conexión de la app (lee `$app/env/private`). Solo la importan rutas y hooks.
  - El correo sigue el mismo patrón: `infra/correo/cliente.ts` (`crearCorreo(config)`) e `infra/correo/app.ts`. El dominio no envía correos: devuelve el código y la ruta construye el enlace y envía.
  - El almacenamiento, igual: el dominio define el puerto `Almacen` (`ticket/crear.ts`) y lo recibe por parámetro; `infra/almacenamiento/disco.ts` lo implementa.
  - ESLint lo impone: el dominio puede importar `infra/db/esquema.ts` y `infra/db/tipos.ts` (sin efectos), pero no `app.ts`, `cliente.ts` ni el resto de `infra/`.
- **Migraciones**: se edita `esquema.ts`, `pnpm db:generate` escribe el SQL en `drizzle/`, se **revisa** y se sube junto con el esquema. La CI falla si el esquema y las migraciones no coinciden. No se usa `drizzle-kit push`, porque desincroniza la base de las migraciones. Los datos iniciales y los *triggers* van en migraciones `--custom`.
- **Estados del ticket y acciones del historial**: `src/lib/estados.ts` (compartido con el navegador) y los `pgEnum` del esquema deben coincidir; una comprobación de tipos en `esquema.ts` falla si no.
- **Pruebas e2e**: importan `test` y `expect` de `tests/e2e/base.ts`, que da a cada prueba su propia IP en `X-Forwarded-For` (como Caddy en producción) para que el límite de intentos de entrar por IP no salte por la suma de todas.
- **Importaciones internas con `#lib/...`** y extensión explícita (`#lib/server/infra/db/cliente.ts`): SvelteKit 3 sustituye el alias `$lib` por *subpath imports* de Node.
- **Compilación sin base de datos**: SvelteKit 3 valida las variables también al analizar las rutas durante `vite build`. El script `build` pone una `DATABASE_URL` ficticia si no hay otra; como no es estática, no se incrusta en el resultado (comprobado).
- **Semilla inicial** (`pnpm db:semilla`): conceptos (Ferretería, Alimentación, Representación, Transporte) y el primer tesorero, a partir de variables de entorno (R-06).

## Variables de entorno (`.env.example`)

| Variable | Ejemplo | Uso |
|---|---|---|
| `PROTOCOL_HEADER` | `X-Forwarded-Proto` | Origen real detrás de Caddy (CSRF). En SvelteKit 3 ya no existe `ORIGIN`: el origen sale de la cabecera `Host` y de esta. Fijada en `compose.yaml` |
| `DATABASE_URL` | `postgres://eql4e:…@db:5432/eql4e` | Conexión. En producción la compone `compose.yaml` a partir de `POSTGRES_PASSWORD` |
| `POSTGRES_PASSWORD` | — | Contenedor `db` |
| `BODY_SIZE_LIMIT` | `60M` | Subida de ficheros |
| `ADDRESS_HEADER` / `XFF_DEPTH` | `X-Forwarded-For` / `1` | IP real detrás de Caddy. Fijadas en `compose.yaml` |
| `TEST_DATABASE_URL` | `postgres://eql4e:eql4e@127.0.0.1:5436/postgres` | Solo en local: pruebas de integración sin Testcontainers |
| `URL_PUBLICA` | `https://tickets-eql4e.ddns.net` | Enlaces de activación del log y de los correos. Fijada en `compose.yaml` |
| `RUTA_FICHEROS` | `/data/ficheros` | Volumen |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | `smtp.gmail.com` / `587` / … | ADR-0004 |
| `CORREO_MODO` | `smtp` \| `consola` | Desarrollo sin envío real |
| `TESORERO_INICIAL_*` | nombre, teléfono, email | Semilla (R-06) |
