# 04 · Estructura del repositorio

```
eql4e-tickets/
├── .github/
│   ├── workflows/ci.yml            # lint, pruebas, e2e, imagen a GHCR (ADR-0007)
│   └── dependabot.yml
├── docs/
│   ├── requisitos/                 # Tarea 1
│   ├── arquitectura/               # Tarea 2 (este documento) + adr/
│   └── diseno/                     # Tarea 3: bocetos
├── deploy/
│   ├── compose.yaml                # app + db (ADR-0006)
│   ├── .env.example                # variables documentadas, sin secretos
│   ├── compose.dev.yaml            # PostgreSQL de desarrollo (127.0.0.1:5436)
│   ├── Caddyfile.snippet           # bloque para el Caddy existente
│   └── desplegar.sh                # pull + up -d + comprobación de salud
├── scripts/migrar.js               # aplica las migraciones (entrypoint y pruebas)
├── drizzle/                        # migraciones SQL generadas y versionadas
├── src/
│   ├── hooks.server.ts             # sesión, guardas, cabeceras
│   ├── app.d.ts                    # tipo de locals.usuario
│   ├── lib/
│   │   ├── componentes/            # UI propia + shadcn-svelte (ui/)
│   │   ├── esquemas/               # Zod compartido cliente/servidor
│   │   ├── cliente/                # compresión de imágenes, borrador IndexedDB
│   │   ├── formato.ts              # importes, fechas (Intl es-ES)
│   │   └── server/
│   │       ├── dominio/
│   │       │   ├── auth/           # sesiones, contraseñas, códigos, limitador
│   │       │   ├── ticket/
│   │       │   │   ├── estados.ts  # tabla de transiciones (pura)
│   │       │   │   ├── permisos.ts # R-01, R-04 (puro)
│   │       │   │   └── servicio.ts # casos de uso con transacción
│   │       │   ├── pago/
│   │       │   ├── usuario/
│   │       │   ├── concepto/
│   │       │   └── purga/
│   │       ├── infra/
│   │       │   ├── db/             # esquema Drizzle, cliente, semilla
│   │       │   ├── almacenamiento.ts
│   │       │   ├── correo.ts
│   │       │   ├── imagenes.ts
│   │       │   └── planificador.ts
│   ├── env.ts                      # variables de entorno validadas con Zod (defineEnvVars de SvelteKit 3)
│   └── routes/                     # ver 03-rutas.md
├── static/                         # iconos PWA
├── tests/
│   ├── integracion/                # Vitest + Testcontainers
│   └── e2e/                        # Playwright
├── Dockerfile · docker-entrypoint.sh
├── .env.example                    # variables de desarrollo
├── package.json · pnpm-lock.yaml
└── README.md
```

## Convenciones

- **Código en español** en el dominio (`autorizarTicket`, `registrarPago`), para que coincida con los requisitos. Los términos técnicos del framework se mantienen en inglés (`load`, `actions`, `hooks`).
- **Pruebas unitarias junto al código** (`estados.test.ts`); las de integración y e2e, en `tests/`.
- **Configuración validada al arrancar** (`src/env.ts`, con `defineEnvVars` de SvelteKit 3 y Zod): si falta una variable obligatoria, la app no arranca y lo dice claramente. Se leen con `import { DATABASE_URL } from '$app/env/private'`.
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
| `RUTA_FICHEROS` | `/data/ficheros` | Volumen |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | `smtp.gmail.com` / `587` / … | ADR-0004 |
| `CORREO_MODO` | `smtp` \| `consola` | Desarrollo sin envío real |
| `TESORERO_INICIAL_*` | nombre, teléfono, email | Semilla (R-06) |
