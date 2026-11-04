# Arquitectura · eql4e-tickets

> Estado: **v1.0 en revisión** · 2026-11-04

**Resumen**: monolito modular **SvelteKit (TypeScript)** + **PostgreSQL** (Drizzle) + ficheros en un volumen de disco, en `docker compose` detrás del **Caddy existente**, publicado en `tickets-eql4e.ddns.net`. PWA *responsive*. Sesiones propias en base de datos. Email por SMTP.

| Documento | Contenido |
|---|---|
| [01-c4.md](01-c4.md) | Diagramas de contexto, contenedores y componentes |
| [02-modelo-datos.md](02-modelo-datos.md) | Entidades, restricciones e índices |
| [03-rutas.md](03-rutas.md) | Páginas, acciones y endpoints por historia |
| [04-estructura.md](04-estructura.md) | Repositorio, convenciones y variables de entorno |

## Decisiones (ADR)

| ADR | Tema | Estado |
|---|---|---|
| [0001](adr/0001-stack.md) | Stack: SvelteKit | Aceptada |
| [0002](adr/0002-persistencia.md) | PostgreSQL + Drizzle; ficheros en volumen | Aceptada |
| [0003](adr/0003-autenticacion.md) | Sesiones propias, Argon2id, autorización en el dominio | Aceptada |
| [0004](adr/0004-email.md) | SMTP de Gmail con contraseña de aplicación | **Propuesta** |
| [0005](adr/0005-ui-pwa.md) | Tailwind + shadcn-svelte, Superforms + Zod, PWA solo con recursos estáticos | Aceptada |
| [0006](adr/0006-despliegue.md) | Compose en `127.0.0.1:3080`, bloque en Caddy, imágenes en GHCR | Aceptada (con verificaciones) |
| [0007](adr/0007-calidad.md) | Vitest, Testcontainers, Playwright, GitHub Actions | Aceptada |
