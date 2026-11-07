# eql4e-tickets

Aplicación web (PWA *responsive*) para que los socios de la asociación envíen los tickets de sus compras y los tesoreros los autoricen y registren su pago.

> Estado: **en construcción**. Requisitos, arquitectura y diseño aprobados (v1.0). Esqueleto e infraestructura (Tarea 4) desplegados en https://tickets-eql4e.ddns.net.

## Documentación

| Fase | Documentos |
|---|---|
| Requisitos | [docs/requisitos](docs/requisitos/README.md) |
| Arquitectura y decisiones (ADR) | [docs/arquitectura](docs/arquitectura/README.md) |
| Diseño y bocetos | [docs/diseno](docs/diseno/README.md) |
| Protocolo de prueba final (manual, en producción) | [docs/pruebas/protocolo.md](docs/pruebas/protocolo.md) |

## Stack

SvelteKit (TypeScript) · PostgreSQL + Drizzle · Tailwind + shadcn-svelte · Vitest + Playwright · Docker Compose detrás de Caddy · imágenes en GHCR.

## Desarrollo

Requisitos: Node 24 y pnpm (`corepack enable`). Docker con `sudo` para el PostgreSQL de desarrollo.

```bash
pnpm install
cp .env.example .env
sudo docker compose -f deploy/compose.dev.yaml up -d   # PostgreSQL en 127.0.0.1:5436
pnpm dev
```

| Comando | Qué hace |
|---|---|
| `pnpm lint` · `pnpm check` | Formato, ESLint y tipos |
| `pnpm test:unit` | Pruebas unitarias (Vitest, modo vigilancia) |
| `pnpm test:integracion` | Contra PostgreSQL real: `TEST_DATABASE_URL` en local o Testcontainers |
| `pnpm test:e2e` | Playwright, perfiles móvil y escritorio (necesita `pnpm build` y la base de datos) |
| `pnpm db:generate` · `pnpm db:migrar` | Generar y aplicar migraciones |

## Despliegue

Cada *push* a `main` que pasa la CI publica `ghcr.io/luislozano/eql4e-tickets`. En la máquina: `cd /opt/eql4e-tickets && sudo ./desplegar.sh`. Instalación, actualización, logs y vuelta atrás: [manual de despliegue](deploy/README.md). Decisiones: [ADR-0006](docs/arquitectura/adr/0006-despliegue.md).

## Licencia

[MIT](LICENSE)
