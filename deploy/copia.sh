#!/bin/sh
# Copia de seguridad de eql4e-tickets (ADR-0008): volcado de PostgreSQL y ficheros, en el disco externo.
# La lanza cada día a las 19:30 el timer eql4e-copia.timer; a mano, desde la carpeta de despliegue:
#   cd /opt/eql4e-tickets && sudo ./copia.sh
set -eu
cd "$(dirname "$0")"
umask 077

DESTINO=${DESTINO_COPIAS:-/mnt/externalHD/eql4e/backups}
DIARIAS=7
SEMANAS=5 # la semana en curso y las 4 anteriores: ninguna copia pasa de ~5 semanas (RNF-22)

# Si el disco no está montado, la ruta no existe o es una carpeta del disco del sistema: no se copia.
if [ ! -d "$DESTINO" ] || [ "$(stat -c %d "$DESTINO")" = "$(stat -c %d /)" ]; then
	echo "✘ $DESTINO no está en el disco externo (¿está montado?). No se ha hecho la copia." >&2
	exit 1
fi

nombre=$(date +%Y-%m-%d_%H%M)
temporal="$DESTINO/.en-curso-$nombre"
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

mv "$temporal" "$DESTINO/$nombre"
trap - EXIT
echo "✔ Copia en $DESTINO/$nombre ($(du -sh "$DESTINO/$nombre" | cut -f1))"

# restaurar.sh copia el estado actual sin rotar: la rotación podría borrar la copia a restaurar.
[ "${SIN_ROTAR:-}" = 1 ] && exit 0

# Rotación: las $DIARIAS más recientes y, de las semanas anteriores, la última de cada semana.
semanas=''
n=0
for copia in $(ls -1 "$DESTINO" | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}$' | sort -r); do
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
		rm -rf "${DESTINO:?}/$copia"
		echo "  Borrada la copia antigua $copia"
	fi
done

# Restos de copias interrumpidas (corte de luz, disco desconectado…).
find "$DESTINO" -maxdepth 1 -name '.en-curso-*' -mtime +1 -exec rm -rf {} +
