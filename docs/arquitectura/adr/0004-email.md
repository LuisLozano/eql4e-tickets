# ADR-0004 · Envío de email

- **Estado**: Aceptada (2026-11-04)
- **Fecha**: 2026-11-04

## Contexto

- Solo se envían invitaciones y restablecimientos de contraseña: decenas de correos al mes.
- La asociación **no tiene dominio propio**: la app vive en `ddns.net`, que no controlamos, así que no podemos configurar SPF ni DKIM.
- Lo importante es que el correo **no acabe en spam**.

## Opciones

| | Gmail de la asociación (SMTP + contraseña de aplicación) | Brevo (plan gratuito, 300 correos al día) |
|---|---|---|
| Remitente | `asociacion@gmail.com` | Una dirección verificada; sin dominio propio sería también una de Gmail |
| Entregabilidad | Buena: lo envía Google desde su propio dominio | **Mala sin dominio propio**: enviar como `@gmail.com` desde servidores de Brevo no supera DMARC y puede acabar en spam o rechazado |
| Requisitos | Cuenta de Gmail con verificación en dos pasos + contraseña de aplicación | Alta en Brevo + clave SMTP |
| Límite | ~500 al día | 300 al día |

## Decisión

**SMTP de una cuenta de Gmail de la asociación** con contraseña de aplicación, mediante **Nodemailer**.

- La configuración va por variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), en el `.env` excluido de git.
- Detrás de una interfaz `Correo` con dos implementaciones: SMTP para producción y **"consola/fichero"** para desarrollo y pruebas, que nunca envía correos reales.
- El envío es **síncrono** dentro de la acción. Si falla, el alta se guarda igualmente y el tesorero ve el aviso con el enlace para copiarlo (HU-G02). No hace falta cola con este volumen.
- Tras el alta, el tesorero **siempre** ve el enlace de activación para copiarlo, no solo si falla el envío: mientras el correo esté en modo consola (hasta tener el Gmail), es la única forma de que llegue al socio. Solo se puede mostrar en ese momento, porque se guarda el hash del código. *(PR 2, 2026-11-05)*
- **Restablecimiento (HU-A04)**: al revés que la invitación, la acción responde sin esperar: crear el código y enviar el correo pasan en segundo plano, porque solo ocurren si el teléfono tiene cuenta y el tiempo de respuesta lo delataría. Un fallo de envío queda en el log; el usuario puede pedir otro enlace o que un tesorero le reenvíe la invitación. *(2026-11-09)*
- Con `CORREO_MODO=smtp` y alguna variable `SMTP_*` sin poner, la app arranca igual: cada envío falla con un error que dice qué falta, y el tesorero copia el enlace.
- Si en el futuro la asociación tiene dominio propio, se cambia a Brevo o similar solo con configuración.

## Configuración por entorno

- **Producción**: la cuenta de Gmail de la asociación (confirmado que existe).
- **Pruebas manuales**: cualquier cuenta, por ejemplo la personal del desarrollador, cambiando solo las variables `SMTP_*` del `.env` local. Ninguna cuenta está escrita en el código.
- **Desarrollo y pruebas automáticas**: `CORREO_MODO=consola`, que nunca envía correos reales.
