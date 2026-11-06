#!/bin/sh
# Restaura una copia de seguridad de eql4e-tickets (ADR-0008). Desde la carpeta de despliegue:
#   sudo ./restaurar.sh --simulacro <carpeta>   la restaura en un PostgreSQL temporal y la cuenta;
#                                               producción no se toca
#   sudo ./restaurar.sh <carpeta>               SUSTITUYE la base y los ficheros de producción
# <carpeta> es una de las de /mnt/externalHD/eql4e/backups, por ejemplo 2026-11-07_1930.
set -eu
cd "$(dirname "$0")"

simulacro=no
if [ "${1:-}" = --simulacro ]; then
	simulacro=si
	shift
fi
if [ $# -ne 1 ]; then
	sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//' >&2
	exit 2
fi
case "$1" in
/*) copia=$1 ;;
*) copia="${DESTINO_COPIAS:-/mnt/externalHD/eql4e/backups}/$1" ;;
esac

echo "Comprobando $copia"
(cd "$copia" && sha256sum -c --quiet SHA256SUMS)

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
		select 'usuarios', count(*) from usuario
		union all select 'tickets', count(*) from ticket
		union all select 'pagos', count(*) from pago
		union all select 'ficheros en la base', count(*) from ticket_fichero
		union all select 'justificantes en la base', count(*) from pago where justificante_ruta is not null
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
SIN_ROTAR=1 ./copia.sh || {
	echo '✘ No se ha podido copiar el estado actual. No se ha restaurado nada.' >&2
	exit 1
}

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
