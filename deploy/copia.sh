#!/bin/sh
# Copia de seguridad de eql4e-tickets (ADR-0008): volcado de PostgreSQL y ficheros, en dos discos
# distintos del sistema (uno interno y el externo). La lanza cada día a las 19:30 el timer
# eql4e-copia.timer; a mano, desde la carpeta de despliegue:
#   cd /opt/eql4e-tickets && sudo ./copia.sh
# Sale con 0 si la copia está en todos los destinos, con 3 si está solo en alguno y con 1 si en ninguno.
set -eu
cd "$(dirname "$0")"
umask 077

# Separados por espacios; el primero que esté disponible es donde se hace la copia. Lo mismo en restaurar.sh.
DESTINOS=${DESTINO_COPIAS:-/mnt/eql4e_copias/backups /mnt/externalHD/eql4e/backups}
DIARIAS=7
SEMANAS=5 # la semana en curso y las 4 anteriores: ninguna copia pasa de ~5 semanas (RNF-22)

# Si un disco no está montado, su ruta no existe o es una carpeta del disco del sistema: ahí no se
# copia, pero sí en los demás.
disponibles=''
fallos=0
for destino in $DESTINOS; do
	if [ -d "$destino" ] && [ "$(stat -c %d "$destino")" != "$(stat -c %d /)" ]; then
		disponibles="$disponibles $destino"
	else
		echo "✘ $destino no está en un disco aparte del sistema (¿está montado?). Ahí no se copia." >&2
		fallos=$((fallos + 1))
	fi
done
if [ -z "$disponibles" ]; then
	echo '✘ No hay ningún destino disponible. No se ha hecho la copia.' >&2
	exit 1
fi
set -- $disponibles
principal=$1
shift

# Dos copias del mismo minuto se llamarían igual: la segunda espera al minuto siguiente.
nombre=$(date +%Y-%m-%d_%H%M)
for destino in $disponibles; do
	while [ -e "$destino/$nombre" ]; do
		sleep 5
		nombre=$(date +%Y-%m-%d_%H%M)
	done
done
temporal="$principal/.en-curso-$nombre"
trap 'rm -rf "$temporal"' EXIT
mkdir "$temporal"

# Lanzada al arrancar el equipo (Persistent), los contenedores pueden estar todavía levantándose.
listo=no
for _ in $(seq 1 60); do
	if docker compose exec -T db pg_isready -U eql4e -d eql4e -q >/dev/null 2>&1; then
		listo=si
		break
	fi
	sleep 2
done
if [ "$listo" = no ]; then
	echo "✘ PostgreSQL no responde. No se ha hecho la copia." >&2
	exit 1
fi

# Primero la base y después los ficheros: la app guarda el fichero antes de la transacción, así
# que lo subido durante la copia como mucho sobra; nunca falta un fichero al que apunte la base.
docker compose exec -T db pg_dump -U eql4e -d eql4e -Fc >"$temporal/eql4e.dump"
docker compose run --rm --no-deps -T --entrypoint tar app -C /data/ficheros -czf - . \
	>"$temporal/ficheros.tar.gz"

# Comprobar que se pueden leer antes de darlas por buenas.
docker compose exec -T db pg_restore --list <"$temporal/eql4e.dump" >/dev/null
gzip -t "$temporal/ficheros.tar.gz"
(cd "$temporal" && sha256sum eql4e.dump ficheros.tar.gz >SHA256SUMS)

mv -T "$temporal" "$principal/$nombre"
echo "✔ Copia en $principal/$nombre ($(du -sh "$principal/$nombre" | cut -f1))"

# Réplica en los demás destinos, comprobada con las sumas. Si falla una, se sigue con las otras.
for destino in "$@"; do
	temporal="$destino/.en-curso-$nombre"
	if cp -R "$principal/$nombre" "$temporal" && (cd "$temporal" && sha256sum -c --quiet SHA256SUMS) &&
		mv -T "$temporal" "$destino/$nombre"; then
		echo "✔ Copia en $destino/$nombre"
	else
		echo "✘ No se ha podido copiar a $destino." >&2
		rm -rf "$temporal"
		fallos=$((fallos + 1))
	fi
done
temporal=''
trap - EXIT

# restaurar.sh copia el estado actual sin rotar: la rotación podría borrar la copia a restaurar.
if [ "${SIN_ROTAR:-}" != 1 ]; then
	for destino in $disponibles; do
		# Rotación: las $DIARIAS más recientes y, de las semanas anteriores, la última de cada semana.
		semanas=''
		n=0
		for copia in $(ls -1 "$destino" | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}$' | sort -r); do
			n=$((n + 1))
			semana=$(date -d "${copia%_*}" +%G-%V)
			case " $semanas " in
			*" $semana "*) nueva=no ;;
			*) nueva=si ;;
			esac
			if [ "$n" -le "$DIARIAS" ]; then
				[ "$nueva" = si ] && semanas="$semanas $semana"
			elif [ "$nueva" = si ] && [ "$(echo "$semanas" | wc -w)" -lt "$SEMANAS" ]; then
				semanas="$semanas $semana"
			else
				rm -rf "${destino:?}/$copia"
				echo "  Borrada la copia antigua $destino/$copia"
			fi
		done

		# Restos de copias interrumpidas (corte de luz, disco desconectado…).
		find "$destino" -maxdepth 1 -name '.en-curso-*' -mtime +1 -exec rm -rf {} +
	done
fi

[ "$fallos" -eq 0 ] || exit 3
