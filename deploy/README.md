# Manual de administrador · eql4e-tickets

Procedimiento para instalar, actualizar y operar la aplicación en la máquina `yaroki`. Las decisiones y sus motivos están en [ADR-0006](../docs/arquitectura/adr/0006-despliegue.md). El PDF de este manual se genera con `pnpm manual:admin` ([docs/manual/README.md](../docs/manual/README.md)).

## Cómo está montado

| Pieza | Dónde |
|---|---|
| Carpeta de despliegue | `/opt/eql4e-tickets`: `compose.yaml`, `desplegar.sh`, `copia.sh`, `restaurar.sh`, `.env.example` y `.env` (permisos 600) |
| Imagen | `ghcr.io/luislozano/eql4e-tickets` (pública). La CI la publica en cada *push* a `main` con dos etiquetas: `latest` y el SHA corto del commit |
| Contenedores | `eql4e-app-1` en `127.0.0.1:3080`; `eql4e-db-1` (PostgreSQL 18) sin puertos publicados |
| Datos | Volúmenes `eql4e_pgdata` (base de datos) y `eql4e_ficheros` (fotos y justificantes) |
| Copias de seguridad | Cada día a las 19:30 en dos discos: el interno, `/mnt/eql4e_copias/backups`, y el externo, `/mnt/externalHD/eql4e/backups` (apartado 5, [ADR-0008](../docs/arquitectura/adr/0008-copias.md)) |
| Proxy HTTPS | El Caddy de Salazar (`salazar-https-caddy-1`, red del host), con el Caddyfile en `/home/luis/salazar/https/Caddyfile` |
| Dominio | `tickets-eql4e.ddns.net` (No-IP), con la misma IP que `yaroki.ddns.net` |

Todos los comandos de Docker van con `sudo`: `luis` no está en el grupo `docker`.

### Scripts y unidades

Los ficheros de `deploy/` del repositorio se copian a mano a la máquina (apartado 1, «Si el PR cambió algo de `deploy/`»); los de la imagen llegan con cada despliegue.

| En el repositorio | Instalado en | Quién lo lanza | Qué hace |
|---|---|---|---|
| `deploy/desplegar.sh` | `/opt/eql4e-tickets/` | Tú: `sudo ./desplegar.sh` | Descarga la imagen de `ETIQUETA`, recrea los contenedores y espera a que la app esté sana; si no, enseña el log y termina con error (apartado 1) |
| `deploy/copia.sh` | `/opt/eql4e-tickets/` | El timer, cada día a las 19:30; o tú: `sudo ./copia.sh` | Vuelca la base y los ficheros, los comprueba, los deja en los dos discos de copias y borra las antiguas (apartado 5) |
| `deploy/restaurar.sh` | `/opt/eql4e-tickets/` | Tú: `sudo ./restaurar.sh --simulacro <copia>` o `sudo ./restaurar.sh <copia>` | Con `--simulacro`, restaura la copia en un PostgreSQL temporal y cuenta lo que hay, sin tocar producción. Sin él, sustituye la base y los ficheros de producción, tras una confirmación y una copia del estado actual (apartados 5.3 y 5.4) |
| `deploy/eql4e-copia.service` | `/opt/eql4e-tickets/` y `/etc/systemd/system/` | El timer | Ejecuta `copia.sh` cuando Docker y los discos de copias están montados |
| `deploy/eql4e-copia.timer` | `/opt/eql4e-tickets/` y `/etc/systemd/system/` | systemd | Lanza el servicio cada día a las 19:30 y, si el equipo estaba apagado, al arrancar |
| `deploy/compose.yaml` | `/opt/eql4e-tickets/` | `desplegar.sh` y los comandos `docker compose` | Define los contenedores `app` y `db`, sus volúmenes y su configuración |
| `deploy/.env.example` | `/opt/eql4e-tickets/` | — | Plantilla del `.env` (apartado 7) |
| `deploy/Caddyfile.snippet` | Dentro de `/home/luis/salazar/https/Caddyfile` | Caddy | El bloque que publica la app en `tickets-eql4e.ddns.net` (apartado 4.3) |
| `scripts/migrar.js` | En la imagen | `docker-entrypoint.sh`, al arrancar el contenedor | Aplica las migraciones de la base que falten antes de arrancar la app |
| `docker-entrypoint.sh` | En la imagen | Docker, al arrancar el contenedor | Lanza `migrar.js` y después la app |
| `deploy/compose.dev.yaml` | — | Solo en desarrollo | PostgreSQL para el desarrollo y las pruebas en local (puerto 5436) |

### Tareas programadas

Cada día, en hora de Madrid. Las dos primeras las lanza la propia app (croner, dentro del contenedor): si la app está parada a esa hora, ese día no se hacen. La copia la lanza systemd.

| Hora | Tarea | Qué hace | Dónde se ve |
|---|---|---|---|
| 18:55 | Purga (HU-G05) | Borra los tickets cerrados (pagados, rechazados o anulados) con más de 18 meses desde la compra, con sus ficheros e historial, y los pagos que se quedan sin tickets. Los pendientes no los toca: el tesorero los ve en un aviso | Log de la app: `[tareas] purga: …` (solo cifras) |
| 19:00 | Huérfanos | Borra los ficheros de más de un día que no son de ningún ticket ni pago (de subidas cortadas a medias). Si son más de 50, no borra ninguno y lo avisa en el log para revisarlo a mano | Log de la app: `[tareas] huerfanos: …` |
| 19:30 | Copia de seguridad | `copia.sh` (apartado 5) | `systemctl status eql4e-copia` y `sudo journalctl -u eql4e-copia` |

## 1. Actualizar a la última versión (lo habitual)

Después de integrar un PR en `main` y de que la CI termine en verde, que es cuando se publica la imagen:

```bash
cd /opt/eql4e-tickets && sudo ./desplegar.sh
```

El script descarga la imagen, recrea los contenedores, aplica las migraciones al arrancar y espera a que Docker marque la app como *healthy* (su comprobación de `/salud` va cada 30 s, así que tarda unos 30 segundos). Si Docker la marca *unhealthy*, el contenedor se para o no está sana en 2 minutos, muestra las últimas líneas del log y termina con error.

### Si el PR cambió algo de `deploy/`

`desplegar.sh` solo descarga la imagen nueva; **no actualiza los ficheros de `/opt/eql4e-tickets`**. Antes de desplegar, comprueba si han cambiado:

```bash
cd /home/luis/desarrollo/eql4e && git switch main && git pull --ff-only
```

```bash
for f in compose.yaml desplegar.sh copia.sh restaurar.sh .env.example eql4e-copia.service eql4e-copia.timer; do diff -q /home/luis/desarrollo/eql4e/deploy/$f /opt/eql4e-tickets/$f; done
```

Si sale alguna diferencia, cópialos (el `.env` no se toca):

```bash
sudo cp /home/luis/desarrollo/eql4e/deploy/{compose.yaml,desplegar.sh,copia.sh,restaurar.sh,.env.example,eql4e-copia.service,eql4e-copia.timer} /opt/eql4e-tickets/
```

Si han cambiado las unidades de systemd (`eql4e-copia.*`), reinstálalas como en el apartado 5.1.

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
| Tareas programadas (purga a las 18:55 y huérfanos a las 19:00, cada día) | `sudo docker compose logs app \| grep '\[tareas\]'` |
| Log de Caddy (certificados, errores del proxy) | `sudo docker logs --since 30m salazar-https-caddy-1` |

### 2.1 Qué buscar en el log de la app

| Línea | Qué significa |
|---|---|
| `[migrar] Migraciones aplicadas.` | Arranque normal: la base está al día |
| `[tareas] purga: …` y `[tareas] huerfanos: …` | Resultado de las tareas diarias. `[tareas] … error` es un fallo: va seguido del motivo |
| `TESORERO INICIAL` | No hay ningún tesorero activo: el enlace para activar el tesorero inicial (apartado 4.4) |
| `CORREO (modo consola, no se envía)` | Con `CORREO_MODO=consola`, un correo que no se ha enviado, con su enlace |
| `[correo] No se pudo enviar …` | Ha fallado un envío: invitación o restablecimiento de contraseña. El motivo va detrás (apartado 7.1) |
| `env_invalid` | Falta una variable del `.env` o no es válida; la línea dice cuál. La app no arranca |

Para buscar algo concreto: `sudo docker compose logs app | grep '\[correo\]'`.

> **Nunca** ejecutes `docker compose down -v` ni `docker volume rm eql4e_…`: borran la base de datos y los ficheros. Solo quedaría lo que haya en la última copia de seguridad (apartado 5).

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

**Cuidado con las migraciones.** Solo avanzan. Si la versión mala aplicó una migración que la anterior no entiende, volver atrás no basta: hay que restaurar una copia de seguridad (apartado 5.4) hecha antes de desplegar la versión mala.

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
sudo mkdir -p /opt/eql4e-tickets && sudo cp /home/luis/desarrollo/eql4e/deploy/{compose.yaml,desplegar.sh,copia.sh,restaurar.sh,.env.example,eql4e-copia.service,eql4e-copia.timer} /opt/eql4e-tickets/
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

### 4.4 Activar el tesorero inicial

En el primer arranque no hay ningún tesorero, así que la app crea uno con datos ficticios (R-06) y escribe en el log un enlace para activarlo:

```bash
cd /opt/eql4e-tickets && sudo docker compose logs app | grep -A 8 'TESORERO INICIAL'
```

Abre el enlace, escribe el teléfono `600 000 000` y elige una contraseña. El enlace vale 7 días; si caduca, reinicia la app (`sudo docker compose restart app`) y saldrá uno nuevo. Mientras no haya un tesorero activo, cada arranque genera un enlace nuevo e invalida el anterior.

### 4.5 Comprobación

```bash
curl -s https://tickets-eql4e.ddns.net/salud && curl -s -o /dev/null -w 'yaroki: %{http_code}\n' https://yaroki.ddns.net/
```

El resultado esperado es `{"estado":"ok"}` y `yaroki: 200`.

## 5. Copias de seguridad

Cada día a las 19:30 (antes de la copia de Salazar, a las 20:00, y del apagado programado, a las 20:20), un timer de systemd ejecuta `copia.sh`, que deja la misma carpeta `AAAA-MM-DD_HHMM` en dos discos distintos del sistema: el disco duro interno (`/mnt/eql4e_copias/backups`, un volumen LVM de 10 GB en `sda`) y el disco USB externo (`/mnt/externalHD/eql4e/backups`). Cada carpeta lleva:

- `eql4e.dump`: la base de datos;
- `ficheros.tar.gz`: las fotos y los justificantes;
- `SHA256SUMS`: las sumas para comprobar que no se han estropeado.

La copia se hace en el disco interno y se replica en el externo, comprobando las sumas. Si falta uno de los dos discos, la copia queda en el otro y el servicio termina con error. En cada disco se guardan las 7 copias más recientes y la última de cada semana anterior, hasta 5 semanas. Las decisiones están en [ADR-0008](../docs/arquitectura/adr/0008-copias.md).

### 5.1 Instalación (una sola vez)

1. Crea el volumen del disco interno, formatéalo y móntalo con `nofail` (hecho el 2026-11-09):
   ```bash
   sudo lvcreate -L 10G -n eql4e_copias containers_data && sudo mkfs.ext4 -L eql4e_copias /dev/containers_data/eql4e_copias
   ```
   ```bash
   sudo mkdir /mnt/eql4e_copias && echo '/dev/containers_data/eql4e_copias  /mnt/eql4e_copias  ext4  defaults,nofail  0 2' | sudo tee -a /etc/fstab
   ```
   ```bash
   sudo systemctl daemon-reload && sudo mount /mnt/eql4e_copias && sudo install -d -m 700 /mnt/eql4e_copias/backups
   ```
2. Monta el disco externo solo para root y con `nofail`, para que el equipo arranque aunque no esté conectado. En `/etc/fstab`, cambia las opciones de su línea, de `defaults` a `defaults,nofail,uid=0,gid=0,umask=077`. La línea queda así:
   ```
   UUID=26BEF288BEF24FB3 /mnt/externalHD ntfs defaults,nofail,uid=0,gid=0,umask=077 0 0
   ```
   ```bash
   sudo nano /etc/fstab
   ```
3. Vuelve a montarlo y comprueba que ya no lo puede leer cualquiera (tiene que salir `drwx------ … root root`):
   ```bash
   sudo systemctl daemon-reload && sudo umount /mnt/externalHD && sudo mount /mnt/externalHD && ls -ld /mnt/externalHD
   ```
4. Copia los scripts y las unidades a la carpeta de despliegue, si no lo hiciste al actualizar (apartado 1), e instala el timer. Si ya estaba instalado y cambia `eql4e-copia.service`, repite este paso para copiarlo a `/etc/systemd/system`:
   ```bash
   sudo cp /opt/eql4e-tickets/eql4e-copia.{service,timer} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now eql4e-copia.timer
   ```
5. Haz la primera copia a mano y después un simulacro (apartado 5.3):
   ```bash
   sudo systemctl start eql4e-copia && sudo journalctl -u eql4e-copia -n 20 --no-pager
   ```

### 5.2 Comprobar que se están haciendo

| Para | Comando |
|---|---|
| Cuándo toca la siguiente | `systemctl list-timers eql4e-copia.timer` |
| Si la última salió bien | `systemctl status eql4e-copia` |
| Su salida | `sudo journalctl -u eql4e-copia -n 30 --no-pager` |
| Las copias que hay | `sudo ls -l /mnt/eql4e_copias/backups /mnt/externalHD/eql4e/backups` |
| Hacer una ahora | `cd /opt/eql4e-tickets && sudo ./copia.sh` |

Si un disco no está conectado o montado, `copia.sh` dice «no está en un disco aparte del sistema» para ese disco, copia en el otro y termina con error; nunca escribe en el disco del sistema. Nadie recibe un aviso: mira el estado de vez en cuando.

### 5.3 Simulacro (una vez al mes)

Restaura una copia en un PostgreSQL temporal, sin tocar producción, y cuenta usuarios, tickets, pagos y ficheros. Sirve para saber que las copias se pueden restaurar antes de necesitarlo:

```bash
cd /opt/eql4e-tickets && sudo ./restaurar.sh --simulacro "$(sudo ls /mnt/eql4e_copias/backups | tail -1)"
```

Con el nombre de la copia, el script usa la del disco interno y, si falta o está estropeada, la del externo. Para probar la del externo, pasa la ruta completa (`/mnt/externalHD/eql4e/backups/AAAA-MM-DD_HHMM`). Las cifras deben parecerse a lo que ves en la app. Los «ficheros en la copia» deben ser al menos los «ficheros en la base» más los «justificantes en la base».

### 5.4 Restaurar en producción

**Sustituye** la base de datos y los ficheros por los de la copia: lo guardado después se pierde. Antes de empezar, el script pide escribir `eql4e` y hace una copia del estado actual, por si hay que volver a él. Le basta con que esa copia quede en uno de los dos discos.

1. Elige la copia:
   ```bash
   sudo ls /mnt/eql4e_copias/backups /mnt/externalHD/eql4e/backups
   ```
2. Restáurala (cambia la fecha por la elegida):
   ```bash
   cd /opt/eql4e-tickets && sudo ./restaurar.sh 2026-11-07_1930
   ```

El script para la app, restaura la base en una sola transacción y después los ficheros, y la vuelve a arrancar con la misma imagen. Si la copia es de antes de una migración, la app la aplica al arrancar. Si la copia es de una versión **posterior** a la imagen que está en marcha (por ejemplo, después de volver atrás con `ETIQUETA`), despliega primero esa versión o una más nueva.

Si el disco del sistema se ha perdido entero: haz la instalación desde cero (apartado 4, sin activar el tesorero inicial), monta los discos de copias (5.1, sin volver a crear ni formatear el volumen interno) y restaura la última copia.

## 6. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `desplegar.sh` dice «Falta .env» | No existe `/opt/eql4e-tickets/.env` | Apartado 4.2 |
| `/salud` responde 503 | La app no llega a PostgreSQL | `sudo docker compose ps` (¿`db` está *healthy*?) y `sudo docker compose logs db` |
| La app no arranca y el log dice `env_invalid` | Falta una variable o no es válida | El log dice cuál. Corrígela en `.env` |
| 502 en el navegador | Caddy funciona, pero la app no responde en `127.0.0.1:3080` | `sudo docker compose ps` y el log de la app |
| Error de certificado | El DNS no apunta a la máquina o los puertos 80 y 443 no llegan | Log de Caddy; `getent hosts tickets-eql4e.ddns.net` |
| `docker compose pull` falla | Sin red, o la CI no llegó a publicar la imagen | Pestaña *Actions* en GitHub |

## 7. Configuración (`.env`)

Está en `/opt/eql4e-tickets/.env`, con permisos 600: solo lo lee root. No se guarda en git. Para cambiarlo, edítalo y vuelve a desplegar, que recrea la app con la configuración nueva:

```bash
sudo nano /opt/eql4e-tickets/.env
```

```bash
cd /opt/eql4e-tickets && sudo ./desplegar.sh
```

| Variable | Valor | Para qué |
|---|---|---|
| `ETIQUETA` | `latest` | Versión de la imagen. Un SHA corto para volver atrás (apartado 3) |
| `POSTGRES_PASSWORD` | Aleatoria, generada al instalar | Contraseña de la base de datos. **No la cambies** después del primer arranque (apartado 4.2) |
| `CORREO_MODO` | `consola` o `smtp` | `smtp` envía los correos; `consola` solo los escribe en el log (apartado 2.1) |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor de correo |
| `SMTP_PORT` | `587` | Puerto del servidor de correo |
| `SMTP_USER` | La dirección de Gmail de la asociación | Usuario del servidor de correo |
| `SMTP_PASS` | La contraseña de aplicación de Gmail | No es la clave de la cuenta (apartado 7.1) |
| `SMTP_FROM` | `EQL4E Tickets <dirección de Gmail>` | Remitente que ven los socios |

El resto de la configuración (dirección pública, cabeceras del proxy, carpeta de ficheros) está en `compose.yaml` y en la imagen, y no hace falta tocarla.

### 7.1 Activar el correo

Mientras `CORREO_MODO=consola`, la app no envía nada: el tesorero copia el enlace de cada invitación y en «Entrar» no se ofrece restablecer la contraseña. Para que envíe con el Gmail de la asociación ([ADR-0004](../docs/arquitectura/adr/0004-email.md)):

1. En la cuenta de Google de la asociación, activa la **verificación en dos pasos**: Google solo da contraseñas de aplicación a las cuentas que la tienen.
2. En *Cuenta de Google → Seguridad → Contraseñas de aplicaciones*, crea una para «EQL4E Tickets». Son 16 letras; se puede revocar cuando quieras sin cambiar la clave de la cuenta.
3. En el `.env`, pon `CORREO_MODO=smtp`, `SMTP_USER`, `SMTP_PASS` (la contraseña de aplicación, sin espacios) y `SMTP_FROM`, y despliega.
4. Prueba: un tesorero reenvía una invitación a un usuario de prueba con tu email. Si llega, en el log no sale nada; si falla, sale `[correo] No se pudo enviar …` con el motivo, y el tesorero sigue viendo el enlace para copiarlo.

Si cambia la clave de la cuenta de Google, las contraseñas de aplicación se revocan: crea otra y cámbiala en el `.env`.
