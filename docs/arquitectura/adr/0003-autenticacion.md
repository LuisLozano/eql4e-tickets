# ADR-0003 · Autenticación, sesiones y autorización

- **Estado**: Aceptada
- **Fecha**: 2026-11-04

## Contexto

- Lista cerrada de usuarios, alta por invitación con código y acceso con teléfono y contraseña (HU-A01–A04).
- Las sesiones deben durar 30 días en el móvil y poder invalidarse desde el servidor (baja de usuario, cambio de contraseña).
- SvelteKit no incluye autenticación.

## Decisión

**Sesiones propias en base de datos**, siguiendo el patrón documentado por Lucia (que ya no es una librería, sino una guía de implementación). Unas 200 líneas de código propio, sin dependencia de un proveedor externo.

- **Token de sesión**: 20 bytes aleatorios (`crypto.getRandomValues`) en base32. En la base de datos se guarda **su SHA-256**, no el token, para que un volcado de la base no permita suplantar a nadie.
- **Cookie** `session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30 días.
- **Caducidad deslizante**: si quedan menos de 15 días, se renueva hasta 30.
- **`hooks.server.ts`** valida la sesión en cada petición y deja el usuario en `event.locals.usuario`.
- **Contraseñas**: Argon2id (`@node-rs/argon2`, con los parámetros recomendados por OWASP). Mínimo 8 caracteres, comprobadas contra una lista de unas 10.000 contraseñas comunes empaquetada con la app (sin llamadas externas).
- **Códigos de invitación y restablecimiento**: 32 bytes aleatorios, guardados como SHA-256, de un solo uso, con caducidad (7 días para la invitación, 1 hora para el restablecimiento). Generar uno nuevo invalida los anteriores del mismo usuario.
- **CSRF**: la comprobación de `Origin` que SvelteKit trae activada por defecto en las *form actions*, más `SameSite=Lax`. No hace falta un token CSRF adicional.
- **Fuerza bruta**:
  - Contador de intentos fallidos y `bloqueado_hasta` en la tabla `usuario` (5 intentos, 15 minutos).
  - Además, un limitador **en memoria** por IP en el inicio de sesión, la activación y el restablecimiento. Es suficiente con una sola instancia; si se escalara, pasaría a PostgreSQL.
  - La IP real se obtiene de la cabecera de Caddy (`ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH=1`).
- **Invalidación**: cambiar la contraseña, dar de baja al usuario o restablecer el acceso borra sus sesiones.

### Autorización

- Se comprueba en **dos niveles**:
  - **Guarda de rutas**: en `hooks.server.ts`, todo `/gestion/**` exige el rol tesorero y todo lo demás, salvo las rutas públicas, exige sesión.
  - **Servicios de dominio**: reciben el usuario actor y validan **sus propias reglas**: propiedad del ticket (R-01), separación de funciones (R-04), último tesorero (R-03). La guarda de rutas es una comodidad; la seguridad real vive en el dominio.
- Un recurso ajeno devuelve **404** (R-01).

## Alternativas descartadas

- **Better Auth / Auth.js**: aportan OAuth y otros proveedores que no necesitamos. Su flujo de alta por invitación con teléfono no encaja de serie y habría que pelearse con el framework.
- **Keycloak o Authelia delante**: es otro servicio que operar. Desproporcionado.
- **JWT**: no se pueden invalidar sin una lista de revocación, y el requisito exige invalidar. Una sesión en base de datos es más simple y correcta aquí.

## Consecuencias

- Es código de seguridad propio, así que las pruebas automáticas cubren expresamente: login, bloqueo, caducidad, invalidación, códigos de un solo uso y el acceso a recursos ajenos (RNF-50).
