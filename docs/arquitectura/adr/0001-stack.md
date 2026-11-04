# ADR-0001 · Stack tecnológico de la aplicación

- **Estado**: Aceptada — opción **A · SvelteKit** (2026-11-04)
- **Fecha**: 2026-11-04

## Contexto

- Monolito modular pequeño: menos de 200 usuarios y unos 7.500 tickets vivos como máximo.
- Necesidades técnicas clave:
  - Formularios con subida de ficheros desde el móvil y **compresión de imágenes en el cliente**: hace falta JavaScript en el navegador sí o sí.
  - Listado tipo tabla con filtros y ordenación para escritorio.
  - Sesiones con cookie, envío de email y una tarea programada (purga).
  - Instalable como PWA.
- El autor domina **Spring + Angular** y quiere **aprender algo nuevo**. El mantenimiento será suyo, así que el stack debe ser aprendible sin convertirse en un riesgo para el proyecto.
- Se despliega en Docker en una máquina doméstica compartida con otra app, así que importa el consumo de memoria.

## Criterios (peso)

1. **Encaje con el problema** (×3): móvil, subida de ficheros, PWA y tabla de gestión.
2. **Valor de aprendizaje** respecto a Spring + Angular (×2).
3. **Riesgo y mantenibilidad**: madurez, documentación y comunidad (×2).
4. **Productividad** para un único desarrollador a tiempo parcial (×2).
5. **Ligereza en ejecución** (×1).

## Alternativas

### A. SvelteKit (TypeScript full-stack) + PostgreSQL + Drizzle ORM

Un único framework para servidor y cliente: páginas con renderizado en servidor, *form actions* que funcionan incluso sin JavaScript, endpoints de API y una PWA mediante `vite-plugin-pwa`.

- **Aprendizaje**: alto y transferible. Reactividad por compilación (*runes* de Svelte 5) en lugar de la detección de cambios de Angular, el modelo *full-stack* "carga en servidor / acción en servidor" (el mismo de Remix o Next) y TypeScript en el backend.
- **Encaje**: excelente. La compresión en el cliente, conservar el formulario si falla la red y la tabla interactiva son naturales. La PWA está bien resuelta.
- **Riesgos**:
  - No tiene autenticación incluida. Se implementan sesiones propias siguiendo la guía de Lucia (un patrón pequeño y bien documentado) o se usa Better Auth.
  - El backend no impone estructura (no hay inyección de dependencias como en Spring). Hay que imponer capas a mano: rutas → servicios de dominio → repositorios.
  - El ecosistema de JavaScript cambia mucho.
- **Ejecución**: un contenedor Node, unos 80–150 MB de RAM.

### B. Go (`net/http` + sqlc) + `templ` + HTMX + PostgreSQL

Backend en Go con HTML renderizado en servidor y HTMX para la interactividad. Hay pequeños scripts para la cámara y la compresión.

- **Aprendizaje**: alto. Es un lenguaje nuevo, con concurrencia simple, sin framework mágico y con "hipermedia" en lugar de una SPA. Es una filosofía opuesta a Spring.
- **Encaje**: bueno en gestión y en formularios. Peor en la parte móvil: la compresión, conservar los datos sin conexión y la PWA requieren JavaScript manual, sin un framework que lo integre.
- **Riesgos**: más código de "fontanería" (validación, sesiones, CSRF y migraciones a mano o con librerías sueltas). La productividad inicial es menor.
- **Ejecución**: un binario estático, unos 20–40 MB de RAM, y una imagen mínima.

### C. Elixir + Phoenix LiveView + PostgreSQL (Ecto)

Interfaz renderizada en servidor y sincronizada por WebSocket. Lenguaje funcional sobre la máquina virtual BEAM (de Erlang).

- **Aprendizaje**: el más alto. Programación funcional, modelo de actores, OTP. Cambia la forma de pensar.
- **Encaje**:
  - **Bueno**: la parte de gestión, y la subida de ficheros (*LiveView uploads* es muy completo). Tiene generadores de autenticación integrados (`phx.gen.auth`).
  - **Débil**: el móvil con 4G inestable. LiveView necesita una conexión persistente y la PWA sin conexión no es su terreno.
- **Riesgos**: la curva de aprendizaje y una comunidad más pequeña. Si el proyecto se abandona a medias, es el más difícil de retomar para otra persona.
- **Ejecución**: unos 100–150 MB de RAM.

### Descartadas

- **Next.js**: aporta lo mismo que A con más complejidad (*React Server Components*, caché implícita) y orientado a Vercel.
- **NestJS, Quarkus, Micronaut**: demasiado parecidos a Spring; poco aprendizaje.
- **Django + HTMX**: muy productivo (incluye panel de administración, autenticación y migraciones), pero el aprendizaje es moderado y la parte móvil tiene las mismas limitaciones que B.

## Puntuación (1–5)

| Criterio (peso) | A · SvelteKit | B · Go + HTMX | C · Phoenix LiveView |
|---|:-:|:-:|:-:|
| Encaje (×3) | 5 | 3 | 3 |
| Aprendizaje (×2) | 4 | 4 | 5 |
| Riesgo / mantenibilidad (×2) | 4 | 4 | 3 |
| Productividad (×2) | 4 | 3 | 4 |
| Ligereza (×1) | 3 | 5 | 3 |
| **Total** | **42** | **36** | **36** |

## Recomendación

**A · SvelteKit**. Es la que mejor resuelve la parte más delicada (el socio con el móvil) y ofrece un aprendizaje real y distinto de Angular, sin poner en riesgo terminar el proyecto.

Si el objetivo principal fuera aprender, por encima de terminar pronto, la opción sería **C**, aceptando una PWA más limitada.

## Elementos comunes (independientes de la opción)

- **PostgreSQL** en su propio contenedor (no se reutiliza el del puerto 5435).
- **Ficheros** en un volumen de disco, con la ruta guardada en la base de datos, servidos siempre a través de la app. MinIO no se justifica con este volumen.
- **Caddy existente** como proxy inverso hacia la app por la red local; la app no expone puertos al exterior.
- **Email por SMTP**. El proveedor (Gmail con contraseña de aplicación o Brevo) se decide en un ADR aparte.

## Consecuencias

- **Una sola base de código TypeScript** para servidor y cliente, con el adaptador `@sveltejs/adapter-node` dentro de un contenedor Node LTS.
- **No hay API REST pública.** La interfaz usa `load` (lectura) y *form actions* (escritura) de SvelteKit, con tipos de extremo a extremo. Solo hay endpoints HTTP para lo que no es un formulario: descarga de ficheros, CSV y salud.
- **Hay que imponer capas a mano**, porque SvelteKit no lo hace: las rutas son finas y llaman a servicios de dominio en `src/lib/server/dominio`, que no conocen ni HTTP ni SvelteKit. Ver [04-estructura.md](../04-estructura.md).
- **La autenticación es código propio** (ADR-0003), así que necesita pruebas específicas.
- **Las versiones concretas** (Node, Svelte, SvelteKit, PostgreSQL) se fijan en la Tarea 4, al crear el proyecto.
- **ADRs relacionados:** 0002 persistencia, 0003 autenticación, 0004 email, 0005 UI y PWA, 0006 despliegue, 0007 calidad.
