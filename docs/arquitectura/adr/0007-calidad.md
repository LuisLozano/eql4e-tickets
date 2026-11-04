# ADR-0007 · Pruebas e integración continua

- **Estado**: Aceptada
- **Fecha**: 2026-11-04

## Decisión

### Pirámide de pruebas

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | **Vitest** | Máquina de estados (todas las transiciones válidas e inválidas de 03-estados), matriz de permisos (02-roles), validaciones Zod, cálculo de totales, formato CSV. Funciones puras, sin base de datos. |
| Integración | **Vitest + Testcontainers** (PostgreSQL real en Docker) | Servicios de dominio contra la base de datos: transacciones, concurrencia optimista (E-04), pago agrupado y deshacer (E-02, E-03), purga, sesiones, códigos de un solo uso. |
| Extremo a extremo | **Playwright** | Flujos clave del MVP en dos perfiles, móvil (Pixel o iPhone emulados) y escritorio: activar → subir ticket → autorizar → pagar → el socio ve *Pagado*; rechazo y reenvío; acceso denegado a recursos ajenos. |

- **Diseño para pruebas**: la máquina de estados es una **tabla declarativa** (estado × acción → estado destino + reglas) en `src/lib/server/dominio/ticket/estados.ts`, sin dependencias. El reloj y el almacenamiento se inyectan para poder simularlos.
- **Cobertura**: no hay un porcentaje global como objetivo. Sí es obligatorio el **100 % de las ramas** en `estados.ts`, `permisos.ts` y `auth/`.

### Integración continua (GitHub Actions)

En cada *push* y *pull request*:
1. `pnpm install --frozen-lockfile`
2. `eslint`, `prettier --check` y `svelte-check` (tipos)
3. Pruebas unitarias y de integración (Docker disponible en los *runners* de GitHub)
4. Playwright contra la app construida y un PostgreSQL de servicio
5. `pnpm audit` y Dependabot para las dependencias (RNF-17)
6. En `main`: construir la imagen Docker y publicarla en GHCR con la etiqueta del commit y `latest`

### Convenciones del repositorio

- **Gestor de paquetes**: pnpm.
- **Ramas**: `main` siempre desplegable; ramas `feat/HU-xxx-…` y `fix/…` con *pull request*, aunque el revisor sea uno mismo, para que pase la CI.
- **Commits**: Conventional Commits en español (`feat: …`, `fix: …`, `docs: …`).
