# Manual de despliegue · eql4e-tickets

Procedimiento para instalar, actualizar y operar la aplicación en la máquina `yaroki`. Las decisiones y sus motivos están en [ADR-0006](../docs/arquitectura/adr/0006-despliegue.md).

## Cómo está montado

| Pieza | Dónde |
|---|---|
| Carpeta de despliegue | `/opt/eql4e-tickets`: `compose.yaml`, `desplegar.sh`, `.env.example` y `.env` (permisos 600) |
| Imagen | `ghcr.io/luislozano/eql4e-tickets` (pública). La CI la publica en cada *push* a `main` con dos etiquetas: `latest` y el SHA corto del commit |
| Contenedores | `eql4e-app-1` en `127.0.0.1:3080`; `eql4e-db-1` (PostgreSQL 18) sin puertos publicados |
| Datos | Volúmenes `eql4e_pgdata` (base de datos) y `eql4e_ficheros` (fotos y justificantes) |
| Proxy HTTPS | El Caddy de Salazar (`salazar-https-caddy-1`, red del host), con el Caddyfile en `/home/luis/salazar/https/Caddyfile` |
| Dominio | `tickets-eql4e.ddns.net` (No-IP), con la misma IP que `yaroki.ddns.net` |

Todos los comandos de Docker van con `sudo`: `luis` no está en el grupo `docker`.

## 1. Actualizar a la última versión (lo habitual)

Después de integrar un PR en `main` y de que la CI termine en verde, que es cuando se publica la imagen:

```bash
cd /opt/eql4e-tickets && sudo ./desplegar.sh
```

El script descarga la imagen, recrea los contenedores, aplica las migraciones al arrancar y espera a que `/salud` responda. Si no responde en un minuto, muestra las últimas líneas del log y termina con error.

### Si el PR cambió algo de `deploy/`

`desplegar.sh` solo descarga la imagen nueva; **no actualiza los ficheros de `/opt/eql4e-tickets`**. Antes de desplegar, comprueba si han cambiado:

```bash
cd /home/luis/desarrollo/eql4e && git switch main && git pull --ff-only
```

```bash
for f in compose.yaml desplegar.sh .env.example; do diff -q /home/luis/desarrollo/eql4e/deploy/$f /opt/eql4e-tickets/$f; done
```

Si sale alguna diferencia, cópialos (el `.env` no se toca):

```bash
sudo cp /home/luis/desarrollo/eql4e/deploy/{compose.yaml,desplegar.sh,.env.example} /opt/eql4e-tickets/
```

Si ha cambiado `.env.example`, revisa qué variables nuevas hay y añádelas a mano en el `.env`:

```bash
diff <(grep -o '^[A-Z_]*' /opt/eql4e-tickets/.env.example) <(sudo grep -o '^[A-Z_]*' /opt/eql4e-tickets/.env)
```

```bash
sudo nano /opt/eql4e-tickets/.env
```

## 2. Operación

Ejecuta estos comandos desde `/opt/eql4e-tickets`.

| Para | Comando |
|---|---|
| Ver el estado | `sudo docker compose ps` |
| Ver el log de la app | `sudo docker compose logs -f --tail 100 app` |
| Ver el log de la base de datos | `sudo docker compose logs --tail 100 db` |
| Reiniciar la app | `sudo docker compose restart app` |
| Parar todo (los datos se conservan) | `sudo docker compose down` |
| Comprobar desde fuera | `curl -s https://tickets-eql4e.ddns.net/salud` → `{"estado":"ok"}` |
| Log de Caddy (certificados, errores del proxy) | `sudo docker logs --since 30m salazar-https-caddy-1` |

> **Nunca** ejecutes `docker compose down -v` ni `docker volume rm eql4e_…`: borran la base de datos y los ficheros, y todavía no hay copias de seguridad (pendiente antes de usar la app en serio).

## 3. Volver a una versión anterior

Cada imagen lleva como etiqueta el SHA corto de su commit. Los SHA están en `git log --oneline` o en la pestaña *Actions* de GitHub.

1. Edita el `.env` y pon la versión a la que quieres volver, por ejemplo `ETIQUETA=075dcd1`:
   ```bash
   sudo nano /opt/eql4e-tickets/.env
   ```
2. Despliega:
   ```bash
   cd /opt/eql4e-tickets && sudo ./desplegar.sh
   ```
3. Cuando el problema esté corregido en `main`, vuelve a `ETIQUETA=latest` y despliega otra vez.

**Cuidado con las migraciones.** Solo avanzan. Si la versión mala aplicó una migración que la anterior no entiende, volver atrás no basta: hay que restaurar una copia de la base de datos.

Para que volver atrás siga siendo posible, las migraciones se escriben **compatibles con la versión anterior**. Para quitar o renombrar una columna se hace en dos despliegues: primero se añade la nueva y el código deja de usar la vieja; en un despliegue posterior se borra la vieja.

## 4. Instalación desde cero

Este apartado ya se hizo el 2026-11-04. Sirve si hay que reinstalar en esta máquina o en otra.

### 4.1 Requisitos previos

- El nombre `tickets-eql4e.ddns.net` en No-IP, apuntando a la IP pública de la máquina. Compruébalo con `getent hosts tickets-eql4e.ddns.net`.
- El router redirige los puertos 80 y 443 a la máquina, y `ufw` los permite. Ya es así por `yaroki`.
- El Caddy de Salazar está en marcha: `sudo docker ps | grep caddy`.

### 4.2 Carpeta y configuración

Copia los ficheros de despliegue:

```bash
sudo mkdir -p /opt/eql4e-tickets && sudo cp /home/luis/desarrollo/eql4e/deploy/{compose.yaml,desplegar.sh,.env.example} /opt/eql4e-tickets/
```

Crea el `.env` con una contraseña aleatoria para PostgreSQL. La contraseña no se muestra en pantalla y queda solo en el `.env`:

```bash
cd /opt/eql4e-tickets && sudo cp .env.example .env && sudo chmod 600 .env && sudo sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
```

> No cambies `POSTGRES_PASSWORD` después del primer arranque. PostgreSQL solo la usa al crear la base de datos, y la app dejaría de conectarse.

Despliega:

```bash
cd /opt/eql4e-tickets && sudo ./desplegar.sh
```

### 4.3 Bloque en Caddy

Lo que se añade es el contenido de [Caddyfile.snippet](Caddyfile.snippet), sin tocar el bloque de `yaroki.ddns.net`.

1. Haz una copia de seguridad:
   ```bash
   cp /home/luis/salazar/https/Caddyfile /home/luis/salazar/https/Caddyfile.antes-eql4e
   ```
2. Añade el bloque al final. Se hace con `>>` y no con un editor: el fichero está montado tal cual en el contenedor, y un editor que lo reemplace al guardar haría que Caddy dejara de ver los cambios.
   ```bash
   printf '\n# eql4e-tickets (repositorio LuisLozano/eql4e-tickets, ADR-0006): app en 127.0.0.1:3080.\ntickets-eql4e.ddns.net {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:3080\n\tlog {\n\t\toutput stdout\n\t}\n}\n' >> /home/luis/salazar/https/Caddyfile
   ```
3. Valida la configuración. Si da error, no sigas: ve al paso 5.
   ```bash
   sudo docker exec salazar-https-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
   ```
4. Recarga Caddy. No corta el servicio de `yaroki`, y Caddy pide el certificado de Let's Encrypt en ese momento.
   ```bash
   sudo docker exec salazar-https-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
   ```
5. **Solo si algo falla**, vuelve atrás:
   ```bash
   cp /home/luis/salazar/https/Caddyfile.antes-eql4e /home/luis/salazar/https/Caddyfile && sudo docker exec salazar-https-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
   ```

### 4.4 Comprobación

```bash
curl -s https://tickets-eql4e.ddns.net/salud && curl -s -o /dev/null -w 'yaroki: %{http_code}\n' https://yaroki.ddns.net/
```

El resultado esperado es `{"estado":"ok"}` y `yaroki: 200`.

## 5. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `desplegar.sh` dice «Falta .env» | No existe `/opt/eql4e-tickets/.env` | Apartado 4.2 |
| `/salud` responde 503 | La app no llega a PostgreSQL | `sudo docker compose ps` (¿`db` está *healthy*?) y `sudo docker compose logs db` |
| La app no arranca y el log dice `env_invalid` | Falta una variable o no es válida | El log dice cuál. Corrígela en `.env` |
| 502 en el navegador | Caddy funciona, pero la app no responde en `127.0.0.1:3080` | `sudo docker compose ps` y el log de la app |
| Error de certificado | El DNS no apunta a la máquina o los puertos 80 y 443 no llegan | Log de Caddy; `getent hosts tickets-eql4e.ddns.net` |
| `docker compose pull` falla | Sin red, o la CI no llegó a publicar la imagen | Pestaña *Actions* en GitHub |
