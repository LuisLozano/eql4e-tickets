# ADR-0002 · Persistencia: base de datos y ficheros

- **Estado**: Aceptada
- **Fecha**: 2026-11-04

## Contexto

- Datos relacionales con integridad: usuarios, tickets, pagos e historial.
- Ficheros binarios: hasta 5 por ticket más el justificante de pago, unos 5–8 GB en total con la purga a 18 meses.
- Varios tesoreros pueden actuar a la vez (E-04).

## Decisión

### Base de datos

- **PostgreSQL** en un contenedor propio. No se reutiliza el que escucha en el puerto 5435: así se aíslan versiones, copias de seguridad y ciclo de vida.
- **ORM: Drizzle.** Es SQL tipado y explícito (consultas que se parecen al SQL resultante), las migraciones se generan como ficheros SQL versionados y es ligero. Se acerca más a JdbcTemplate/jOOQ que a JPA, y eso es intencionado: no hay *lazy loading* ni sesión de persistencia implícita.
- **Migraciones** aplicadas automáticamente al arrancar el contenedor, antes de aceptar tráfico (RNF-32).
- **Importes en céntimos** (`integer`): nunca coma flotante.
- **Concurrencia optimista**: columna `version` en `ticket`. Cada transición hace `UPDATE … WHERE id = ? AND version = ?`; si no afecta a ninguna fila, devuelve "otro tesorero ya lo ha modificado" (E-04).
- **Las transiciones de estado y su entrada de historial** se escriben en la **misma transacción**.

### Ficheros

- **En un volumen de disco** (`/data/ficheros`), no en la base de datos ni en MinIO:
  - Un BLOB en PostgreSQL inflaría las copias de la base y la memoria.
  - MinIO añade un servicio más sin aportar nada con este volumen.
  - Se encapsula tras una interfaz `Almacenamiento` (`guardar`, `leer`, `borrar`) por si algún día se cambia.
- **Ruta interna**: `{anio}/{mes}/{uuid}.{ext}`. El nombre original solo se guarda en la base de datos; nunca se usa para construir rutas.
- **Nunca se sirven como estáticos.** Siempre pasan por un endpoint que comprueba permisos (RNF-13), con `Content-Disposition` y `X-Content-Type-Options: nosniff`.
- **Validación al recibir:**
  - Tipo real por *magic bytes* (librería `file-type`).
  - Las imágenes se **recodifican con `sharp`** a WebP, con el lado mayor de 2000 px como máximo. Esto elimina los EXIF/GPS (RNF-16) aunque el cliente no haya comprimido, y neutraliza ficheros manipulados.
  - Los PDF se guardan tal cual, con un límite de 10 MB.
- **Orden de escritura:** primero el fichero, después la transacción de base de datos. Si la transacción falla, se borra el fichero. Una tarea diaria elimina los ficheros huérfanos (sin fila asociada y con más de 24 h).

## Alternativas descartadas

- **Prisma**: más mágico, con un motor propio y migraciones menos transparentes.
- **SQL a mano con `postgres.js`**: viable, pero sin tipado del esquema.
- **Ficheros en PostgreSQL (`bytea`)**: más sencillo de respaldar, pero penaliza el rendimiento y el tamaño de las copias.

## Consecuencias

- Una copia de seguridad coherente necesita **dos cosas**: el volcado de PostgreSQL y el volumen de ficheros. Se tendrá en cuenta al definir la política de copias.
- Las imágenes se procesan en servidor con `sharp` (libvips): unos 50–100 MB de RAM puntuales por subida.
