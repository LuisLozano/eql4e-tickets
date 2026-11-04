# ADR-0006 · Despliegue e integración con el Caddy existente

- **Estado**: Aceptada (con verificaciones pendientes en la Tarea 4)
- **Fecha**: 2026-11-04

## Contexto (observado en la máquina)

- **Caddy** atiende los puertos 80 y 443 y gestiona los certificados. Sirve `yaroki.ddns.net` hacia `127.0.0.1:8083`, una aplicación Java del host. Su API de administración está en `127.0.0.1:2019`. No es un servicio systemd: casi seguro un contenedor con `network_mode: host`.
- **Puertos ocupados**: 22, 80, 443, 631, 2019, 3350, 3389, 5435, 8082, 8083 y 9000.
- **Docker**: el usuario `luis` no tiene acceso al socket de Docker.

## Decisión

- **`docker compose`** con dos servicios:
  - **`app`** (SvelteKit en Node): publicado **solo en `127.0.0.1:3080`**, sin acceso desde fuera de la máquina.
  - **`db`** (PostgreSQL): **sin puertos publicados**, accesible solo por la red interna del compose.
- **Volúmenes con nombre**: `eql4e_pgdata` y `eql4e_ficheros`.
- **Caddy**: se añade un bloque nuevo, sin tocar el de `yaroki`:
  ```
  tickets-eql4e.ddns.net {
      encode zstd gzip
      reverse_proxy 127.0.0.1:3080
  }
  ```
  Caddy obtiene el certificado de Let's Encrypt automáticamente.
- **Límite de tamaño de las peticiones**: el `adapter-node` limita el cuerpo a **512 KB por defecto**. Se fija `BODY_SIZE_LIMIT=60M` (5 ficheros × 10 MB + margen). Si no, la subida de tickets falla.
- **Contenedor de la app**:
  - Imagen *multi-stage* (construcción en `node:<LTS>`, ejecución en `node:<LTS>-slim`), con un usuario sin privilegios y sistema de ficheros de solo lectura salvo `/data/ficheros` y `/tmp`.
  - `healthcheck` contra `/salud` (RNF-34).
  - `restart: unless-stopped`.
- **Arranque**: un *entrypoint* aplica las migraciones y después arranca el servidor.
- **Tareas programadas** (purga mensual y huérfanos diaria): dentro de la app con `croner`, protegidas con un *advisory lock* de PostgreSQL para que nunca se ejecuten dos a la vez.
- **Imágenes**: la CI construye y publica la imagen en **GitHub Container Registry** (`ghcr.io/luislozano/eql4e-tickets`). El despliegue en la máquina es `docker compose pull && docker compose up -d`, lanzado manualmente o con un script. La máquina **no** abre ningún puerto a GitHub (no hay despliegue empujado).
- **Configuración**: un fichero `.env` en la máquina, excluido de git, con `.env.example` documentado en el repositorio.

## Verificaciones pendientes (Tarea 4)

1. Dónde está el `Caddyfile` y cómo se recarga (¿contenedor? ¿qué compose?).
2. Que el puerto 443 de `tickets-eql4e.ddns.net` llega a esta máquina: crear el nombre DDNS con la misma IP pública y comprobar la redirección del router, que debería ser la misma que la de `yaroki`.
3. Acceso a Docker en la máquina: ver la sección siguiente.

## Acceso a Docker: `sudo` (decidido 2026-11-04)

`luis` **no** se añade al grupo `docker`. El despliegue y la operación en producción se hacen con `sudo docker compose …`.

Impacto y cómo se resuelve:

| Impacto | Solución |
|---|---|
| Las pruebas de integración con Testcontainers necesitan Docker sin `sudo` | En local, se usa un PostgreSQL de desarrollo (`deploy/compose.dev.yaml`, levantado con `sudo`) y las pruebas lo detectan con `TEST_DATABASE_URL`, con una base de datos por ejecución. **En la CI** se usa Testcontainers sin restricciones. *Alternativa a valorar:* Docker *rootless* para `luis`, que da Docker sin `sudo` y sin equivaler a root. |
| El asistente (Claude) no puede ejecutar `sudo` porque pide contraseña | Los comandos con `sudo` (despliegue, logs, recargar Caddy) los ejecuta el usuario en su terminal; el asistente los prepara. |
| Los volúmenes y ficheros creados por los contenedores son de root o del UID del contenedor | Se usan volúmenes con nombre, no carpetas montadas del home, así que no hay conflictos de permisos con `luis`. |

## Alternativas descartadas

- **Caddy propio dentro del compose**: imposible, porque los puertos 80 y 443 ya están ocupados.
- **Ruta `/tickets` bajo `yaroki.ddns.net`**: compartiría origen con la otra app (cookies, almacenamiento, alcance de la PWA). Ya se descartó en los requisitos.
- **Construir la imagen en la propia máquina**: válido como alternativa, pero la imagen de GHCR garantiza que se despliega exactamente lo que pasó la CI.
