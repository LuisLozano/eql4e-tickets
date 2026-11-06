# ADR-0008 · Copias de seguridad

- **Estado**: Aceptada
- **Fecha**: 2026-11-06

## Contexto

- Los datos viven en dos volúmenes (ADR-0002, RNF-31): `eql4e_pgdata` (PostgreSQL) y `eql4e_ficheros` (fotos de tickets y justificantes). Una copia coherente necesita los dos.
- El riesgo principal es que se averíe el disco del equipo (RNF-31). También hay que poder volver atrás tras un borrado por error o una migración mala (ADR-0006).
- Las copias no pueden guardar datos más tiempo del que la app los conserva (RNF-22: como mucho 18 meses).
- El equipo tiene un disco USB externo (`/dev/sdc1`, NTFS, 150 GB) montado en `/mnt/externalHD`, distinto del disco del sistema (`/dev/sda1`). Se dedica solo a esto.

## Decisión

- **Qué se copia**: `pg_dump -Fc` de la base y un `tar.gz` del volumen de ficheros. Los dos se sacan con `docker compose` desde sus contenedores, así que no hay que publicar puertos ni leer el `.env`.
- **Orden**: primero la base y después los ficheros. La app guarda el fichero antes de la transacción que lo registra, así que lo que se suba durante la copia como mucho sobra; nunca falta un fichero al que apunte la base. No hace falta parar la app.
- **Dónde**: `/mnt/externalHD/eql4e/backups/AAAA-MM-DD_HHMM/` con `eql4e.dump`, `ficheros.tar.gz` y `SHA256SUMS`. Si el destino no está en otro disco que `/` (disco desmontado), la copia falla en vez de llenar el disco del sistema.
- **Permisos**: NTFS no guarda permisos de Unix, así que se montan para root en `fstab` (`uid=0,gid=0,umask=077`). Con `nofail`, si el disco no está, el equipo arranca igual.
- **Cuándo**: cada noche a las 03:30 con un timer de systemd (`Persistent=true`: si el equipo estaba apagado, al arrancar).
- **Retención**: las 7 copias más recientes y la última de cada una de las semanas anteriores, hasta 5 semanas distintas. Ninguna copia pasa de unas 5 semanas, muy por debajo de los 18 meses de RNF-22.
- **Comprobación**: cada copia se valida al hacerla (`pg_restore --list`, `gzip -t`) y lleva sus sumas SHA-256. `restaurar.sh --simulacro` la restaura en un PostgreSQL temporal y cuenta lo que hay, sin tocar producción.
- **Restauración**: `restaurar.sh` pide confirmación, copia antes el estado actual, para la app, restaura la base en una sola transacción y los ficheros, y la vuelve a arrancar.

## Consecuencias

- Protege contra una avería del disco del sistema, borrados y migraciones malas. **No** protege contra un robo, un incendio o un fallo eléctrico que se lleve los dos discos: haría falta una copia fuera de casa (cifrada con `age` y subida con `rclone`, por ejemplo). Queda para más adelante.
- Si el disco externo se desconecta, las copias fallan sin avisar a nadie: solo se ve en `systemctl status eql4e-copia` y en el journal. Conviene mirarlo de vez en cuando y hacer un simulacro al mes.
- Sin cifrar: quien tenga el disco en la mano puede leer los datos.

## Alternativas descartadas

- **Copia solo en el disco del sistema**: no protege contra su avería, que es el riesgo principal.
- **Cifrar cada copia con `age`**: no hace falta con el disco dedicado y montado solo para root, y obliga a custodiar una clave sin la que no hay restauración. Se reconsiderará con la copia fuera de casa.
- **Copiar los volúmenes en crudo** (`/var/lib/docker/volumes`): con PostgreSQL en marcha la copia puede quedar inconsistente.
