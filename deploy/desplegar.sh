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

printf 'Esperando a que la app esté sana'
for _ in $(seq 1 30); do
	if curl -fsS http://127.0.0.1:3080/salud >/dev/null 2>&1; then
		echo ' ✔'
		docker compose ps
		exit 0
	fi
	printf '.'
	sleep 2
done

echo ' ✘ La app no responde en /salud. Últimas líneas del log:' >&2
docker compose logs --tail 50 app >&2
exit 1
