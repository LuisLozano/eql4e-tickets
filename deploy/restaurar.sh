#!/bin/sh
# Restaura una copia de seguridad de eql4e-tickets (ADR-0008). Desde la carpeta de despliegue:
#   sudo ./restaurar.sh --simulacro <carpeta>   la restaura en un PostgreSQL temporal y la cuenta;
#                                               producción no se toca
#   sudo ./restaurar.sh <carpeta>               SUSTITUYE la base y los ficheros de producción
# <carpeta> es el nombre de una copia, por ejemplo 2026-11-07_1930: se usa la primera que esté entera
# de /mnt/eql4e_copias/backups (disco interno) y /mnt/externalHD/eql4e/backups (externo). También vale
# una ruta completa.
set -eu
cd "$(dirname "$0")"

simulacro=no
if [ "${1:-}" = --simulacro ]; then
	simulacro=si
	shift
fi
if [ $# -ne 1 ]; then
	sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//' >&2
	exit 2
fi
case "$1" in
/*) candidatas=$1 ;;
*)
	candidatas=''
	# Los mismos destinos que en copia.sh.
	for destino in ${DESTINO_COPIAS:-/mnt/eql4e_copias/backups /mnt/externalHD/eql4e/backups}; do
		candidatas="$candidatas $destino/$1"
	done
	;;
esac

copia=''
for candidata in $candidatas; do
	[ -d "$candidata" ] || continue
	echo "Comprobando $candidata"
	if (cd "$candidata" && sha256sum -c --quiet SHA256SUMS); then
		copia=$candidata
		break
	fi
	echo "✘ $candidata está estropeada." >&2
done
if [ -z "$copia" ]; then
	echo "✘ No hay ninguna copia $1 entera." >&2
	exit 1
fi

if [ "$simulacro" = si ]; then
	contenedor=eql4e-simulacro-$$
	trap 'docker rm -f "$contenedor" >/dev/null 2>&1 || true' EXIT
	docker run -d --name "$contenedor" -e POSTGRES_USER=eql4e -e POSTGRES_DB=eql4e \
		-e POSTGRES_HOST_AUTH_METHOD=trust postgres:18-alpine >/dev/null
	printf 'Arrancando un PostgreSQL temporal'
	until docker exec "$contenedor" pg_isready -U eql4e -d eql4e -q 2>/dev/null; do
		printf '.'
		sleep 1
	done
	echo ' ✔'
	docker exec -i "$contenedor" pg_restore -U eql4e -d eql4e --no-owner --exit-on-error \
		<"$copia/eql4e.dump"
	docker exec "$contenedor" psql -U eql4e -d eql4e -At -F ': ' -c "
		select 'usuarios', count(*)::text from usuario
		union all select 'tickets', count(*)::text from ticket
		union all select 'pagos', count(*)::text from pago
		union all select 'ficheros en la base', count(*)::text from ticket_fichero
		union all select 'justificantes en la base', count(*)::text from pago where justificante_ruta is not null
		union all select 'ticket más reciente', coalesce(max(creado_en)::text, '—') from ticket"
	echo "ficheros en la copia: $(tar -tzf "$copia/ficheros.tar.gz" | grep -vc '/$')"
	echo '✔ Simulacro correcto. El PostgreSQL temporal se borra al salir; producción no se ha tocado.'
	exit 0
fi

echo "Vas a SUSTITUIR la base de datos y los ficheros de producción por la copia $(basename "$copia")."
echo 'Lo que se haya guardado después de esa copia se perderá.'
printf 'Para seguir, escribe eql4e: '
read -r respuesta
[ "$respuesta" = eql4e ] || {
	echo 'Cancelado.'
	exit 1
}

echo 'Copiando antes el estado actual, por si hay que volver a él'
# Basta con que quede en un disco (salida 3): si se restaura porque uno se ha averiado, el otro no está.
estado=0
SIN_ROTAR=1 ./copia.sh || estado=$?
if [ "$estado" -ne 0 ] && [ "$estado" -ne 3 ]; then
	echo '✘ No se ha podido copiar el estado actual. No se ha restaurado nada.' >&2
	exit 1
fi

docker compose stop app
trap 'echo "✘ La restauración se ha cortado y la app está PARADA. El estado anterior está en la copia que se acaba de hacer." >&2' EXIT
docker compose exec -T db pg_restore -U eql4e -d eql4e --clean --if-exists --no-owner \
	--single-transaction --exit-on-error <"$copia/eql4e.dump"
docker compose run --rm --no-deps -T --entrypoint sh app -c \
	'find /data/ficheros -mindepth 1 -delete && tar -xzf - -C /data/ficheros' \
	<"$copia/ficheros.tar.gz"
trap - EXIT

# Arranca con la misma imagen (sin descargar otra) y aplica las migraciones que falten.
docker compose start app
printf 'Esperando a que la app esté sana'
for _ in $(seq 1 30); do
	if curl -fsS http://127.0.0.1:3080/salud >/dev/null 2>&1; then
		echo ' ✔'
		echo "✔ Restaurada la copia $(basename "$copia")."
		exit 0
	fi
	printf '.'
	sleep 2
done
echo ' ✘ La app no responde en /salud. Últimas líneas del log:' >&2
docker compose logs --tail 50 app >&2
exit 1
