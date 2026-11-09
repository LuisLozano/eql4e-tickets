#!/bin/sh
# Despliega o actualiza eql4e-tickets (ADR-0006). Ejecutar con sudo desde la carpeta de despliegue:
#   cd /opt/eql4e-tickets && sudo ./desplegar.sh
set -eu
cd "$(dirname "$0")"

if [ ! -f .env ]; then
	echo "Falta .env: copia .env.example a .env y rellénalo." >&2
	exit 1
fi

docker compose pull
docker compose up -d --remove-orphans

# Se espera a la comprobación de salud del propio Docker (HEALTHCHECK del Dockerfile, cada 30 s): así
# la tabla final ya dice «healthy». Hasta 2 minutos, que cubren el margen de arranque y un par de
# comprobaciones. Si el contenedor se reinicia o Docker la marca «unhealthy», se para y enseña el log.
app=$(docker compose ps -q app)
printf 'Esperando a que la app esté sana'
for _ in $(seq 1 60); do
	estado=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app" 2>/dev/null || echo desconocido)
	case "$estado" in
	healthy)
		echo ' ✔'
		docker compose ps
		exit 0
		;;
	unhealthy | exited | dead | desconocido)
		break
		;;
	esac
	printf '.'
	sleep 2
done

echo " ✘ La app no está sana (estado: $estado). Últimas líneas del log:" >&2
docker compose logs --tail 50 app >&2
exit 1
