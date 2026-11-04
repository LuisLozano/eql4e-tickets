# 05 · Requisitos no funcionales

> Estado: **v1.0 aprobada**

## Plataforma y uso

- **RNF-01** Una sola aplicación web **PWA responsive**: instalable en el móvil desde el navegador. La parte de socio está pensada primero para móvil; la de tesorero, para ordenador (≥ 1280 px) y usable en móvil.
- **RNF-02** Navegadores soportados: las dos últimas versiones de Chrome/Edge, Firefox y Safari (iOS ≥ 16, Android ≥ 10).
- **RNF-03** Idioma: español. Moneda: EUR. Zona horaria: Europe/Madrid.
- **RNF-04** Volumen esperado: menos de 200 usuarios y menos de 5.000 tickets al año. Con la conservación de 18 meses (RNF-22) habrá como máximo unos 7.500 tickets vivos y unos 5–8 GB de ficheros.

## Seguridad

- **RNF-10** Solo **HTTPS** (`tickets-eql4e.ddns.net`, certificado Let's Encrypt gestionado por el Caddy existente).
- **RNF-11** Contraseñas: mínimo 8 caracteres, comprobadas contra una lista de contraseñas comunes, guardadas con un hash lento (Argon2id o bcrypt). *Se descarta el PIN corto*: con un PIN de 4–6 dígitos el bloqueo por intentos (HU-A02) sería la única defensa.
- **RNF-12** Sesión en cookie `HttpOnly`, `Secure`, `SameSite=Lax`, con protección CSRF. Las sesiones se pueden invalidar en el servidor (baja de usuario, cambio de contraseña).
- **RNF-13** Autorización comprobada en el servidor en cada petición, incluidas las descargas de ficheros. Los ficheros **no** se sirven como estáticos públicos: siempre pasan por un control de acceso.
- **RNF-14** Los códigos de invitación y de restablecimiento son aleatorios (≥ 128 bits), de un solo uso, con caducidad, y se guardan como hash.
- **RNF-15** Límite de peticiones en el inicio de sesión, la activación y el restablecimiento.
- **RNF-16** Validación del tipo real de los ficheros subidos. Se eliminan los metadatos EXIF (ubicación GPS) de las imágenes.
- **RNF-17** Dependencias revisadas automáticamente en la integración continua (avisos de vulnerabilidades).

## Protección de datos (RGPD)

- **RNF-20** Datos personales mínimos: nombre, teléfono y email. Las imágenes de tickets y los justificantes pueden contener datos personales y bancarios parciales.
- **RNF-21** Texto informativo de privacidad en la pantalla de activación. La asociación es la responsable del tratamiento.
- **RNF-22** Periodo de conservación: **máximo 18 meses** desde la fecha de compra del ticket. *Aviso: es inferior a los plazos habituales de conservación de justificantes de gasto (4 años, prescripción tributaria). La asociación debe confirmar que la app no es su archivo contable o que exporta los justificantes antes de la purga.* Pasado ese plazo se eliminan de forma automática y definitiva (HU-G05). Las copias de seguridad deben tener una retención igual o menor, para no conservar datos ya purgados.
- **RNF-23** No se envían datos a servicios de terceros, salvo el proveedor de email para invitaciones y restablecimientos.

## Fiabilidad y operación

- **RNF-30** Despliegue con **Docker Compose** en esta máquina, sin interferir con la aplicación existente. Se publica solo a través de Caddy; los contenedores no exponen puertos hacia fuera.
- **RNF-31** Los datos (base de datos y ficheros) viven en volúmenes persistentes y documentados, preparados para las copias de seguridad (la política se decide más adelante, pero **antes de la puesta en producción**).
- **RNF-32** Migraciones de base de datos versionadas y automáticas al desplegar.
- **RNF-33** Registros (logs) estructurados por la salida estándar, sin datos sensibles (ni contraseñas, ni códigos, ni contenido de ficheros).
- **RNF-34** Endpoint de salud para Docker (`healthcheck`).
- **RNF-35** Disponibilidad "mejor esfuerzo" (equipo doméstico): no hay SLA. Un corte no debe perder datos ya confirmados.

## Rendimiento y experiencia de uso

- **RNF-40** El formulario de envío de ticket se puede completar en menos de 1 minuto en un móvil de gama media con 4G.
- **RNF-41** Listados del tesorero en menos de 1 s con 10.000 tickets.
- **RNF-42** Accesibilidad básica WCAG 2.1 AA: contraste, etiquetas en formularios, navegación con teclado en la parte de escritorio.

## Calidad

- **RNF-50** Pruebas automáticas de la lógica de estados y permisos (cobertura completa de las transiciones de 03-estados y de la matriz de 02-roles), más pruebas de extremo a extremo de los flujos principales.
- **RNF-51** Integración continua en GitHub Actions: análisis estático, pruebas y construcción de la imagen en cada push.

## Riesgos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El dominio DDNS cambia de IP o el servicio DDNS caduca (No-IP gratuito exige confirmar cada 30 días) | App inaccesible | Revisar el proveedor DDNS / renovación; valorar un dominio propio barato |
| Los emails de invitación acaban en spam o el proveedor bloquea el envío | Los socios no pueden activar su cuenta | Usar SMTP autenticado (con SPF/DKIM si hay dominio); alternativa de copiar el enlace (HU-G02) |
| Fotos HEIC de iPhone | Algunas no se pueden comprimir en el navegador | iOS suele convertir a JPEG al adjuntar; si no, se sube sin comprimir dentro del límite de 10 MB |
| El equipo anfitrión se avería | Pérdida de datos | Política de copia de seguridad fuera de la máquina antes de producción (RNF-31) |
