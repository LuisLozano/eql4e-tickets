# ADR-0008 · Copias de seguridad

- **Estado**: Aceptada
- **Fecha**: 2026-11-06; revisada el 2026-11-09 (segundo destino en el disco interno)

## Contexto

- Los datos viven en dos volúmenes (ADR-0002, RNF-31): `eql4e_pgdata` (PostgreSQL) y `eql4e_ficheros` (fotos de tickets y justificantes). Una copia coherente necesita los dos.
- El riesgo principal es que se averíe el disco del equipo (RNF-31). También hay que poder volver atrás tras un borrado por error o una migración mala (ADR-0006).
- Las copias no pueden guardar datos más tiempo del que la app los conserva (RNF-22: como mucho 18 meses).
- El sistema y los datos de la app están en el SSD (`sdb`). El equipo tiene además un disco USB externo (`sdc1`, NTFS, 150 GB) montado en `/mnt/externalHD`, dedicado a copias, y un disco duro interno (`sda`, 500 GB) con LVM (grupo `containers_data`), casi vacío.

## Decisión

- **Qué se copia**: `pg_dump -Fc` de la base y un `tar.gz` del volumen de ficheros. Los dos se sacan con `docker compose` desde sus contenedores, así que no hay que publicar puertos ni leer el `.env`.
- **Orden**: primero la base y después los ficheros. La app guarda el fichero antes de la transacción que lo registra, así que lo que se suba durante la copia como mucho sobra; nunca falta un fichero al que apunte la base. No hace falta parar la app.
- **Dónde**: en dos discos distintos del sistema, cada uno con `AAAA-MM-DD_HHMM/` (`eql4e.dump`, `ficheros.tar.gz` y `SHA256SUMS`):
  - `/mnt/eql4e_copias/backups`: un volumen LVM propio de 10 GB en el disco interno, para que si se llena no afecte a lo demás del disco. La copia se hace aquí.
  - `/mnt/externalHD/eql4e/backups`: el disco externo. Se replica aquí y se comprueban las sumas.
- **Si falta un disco**: un destino que no está en otro disco que `/` (disco desmontado) se salta, en vez de llenar el disco del sistema. La copia queda en el otro y `copia.sh` termina con error (salida 3), así que se ve en `systemctl status`; antes, sin el externo no había copia. El servicio espera a los dos montajes con `Wants`/`After`, sin exigirlos (`RequiresMountsFor` impediría copiar en el otro).
- **Permisos**: NTFS no guarda permisos de Unix, así que el externo se monta para root en `fstab` (`uid=0,gid=0,umask=077`); en el interno, la carpeta es de root con permisos 700. Los dos con `nofail`: si un disco no está, el equipo arranca igual.
- **Cuándo**: cada día a las 19:30 con un timer de systemd, antes de la copia de Salazar (20:00) y del apagado programado del equipo (20:20). Con `Persistent=true`, si el equipo estaba apagado a esa hora, la copia se hace al arrancar; por eso `copia.sh` espera hasta dos minutos a que PostgreSQL esté listo.
- **Retención**: en cada disco, las 7 copias más recientes y la última de cada una de las semanas anteriores, hasta 5 semanas distintas. Ninguna copia pasa de unas 5 semanas, muy por debajo de los 18 meses de RNF-22.
- **Comprobación**: cada copia se valida al hacerla (`pg_restore --list`, `gzip -t`) y lleva sus sumas SHA-256. `restaurar.sh --simulacro` la restaura en un PostgreSQL temporal y cuenta lo que hay, sin tocar producción.
- **Restauración**: `restaurar.sh` usa la copia del disco interno y, si falta o está estropeada, la del externo. Pide confirmación, copia antes el estado actual, para la app, restaura la base en una sola transacción y los ficheros, y la vuelve a arrancar.

## Consecuencias

- Protege contra una avería del disco del sistema o de uno de los dos de copias, borrados y migraciones malas. **No** protege contra un robo, un incendio o un fallo eléctrico que se lleve el equipo con sus discos: los tres están en la misma casa, y el interno, en la misma máquina. Haría falta una copia fuera de casa (cifrada con `age` y subida con `rclone`, por ejemplo). Queda para más adelante.
- Si un disco se desconecta, la copia se queda en el otro y el fallo no avisa a nadie: solo se ve en `systemctl status eql4e-copia` y en el journal. Conviene mirarlo de vez en cuando y hacer un simulacro al mes.
- Sin cifrar: quien tenga el disco en la mano puede leer los datos.

## Alternativas descartadas

- **Copia solo en el disco del sistema**: no protege contra su avería, que es el riesgo principal.
- **Cifrar cada copia con `age`**: no hace falta con el disco dedicado y montado solo para root, y obliga a custodiar una clave sin la que no hay restauración. Se reconsiderará con la copia fuera de casa.
- **Copiar los volúmenes en crudo** (`/var/lib/docker/volumes`): con PostgreSQL en marcha la copia puede quedar inconsistente.
