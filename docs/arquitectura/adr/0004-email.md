# ADR-0004 · Envío de email

- **Estado**: **Propuesta** (pendiente de confirmar la cuenta)
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

## Decisión propuesta

**SMTP de una cuenta de Gmail de la asociación** con contraseña de aplicación, mediante **Nodemailer**.

- La configuración va por variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), en el `.env` excluido de git.
- Detrás de una interfaz `Correo` con dos implementaciones: SMTP para producción y **"consola/fichero"** para desarrollo y pruebas, que nunca envía correos reales.
- El envío es **síncrono** dentro de la acción. Si falla, el alta se guarda igualmente y el tesorero ve el aviso con el enlace para copiarlo (HU-G02). No hace falta cola con este volumen.
- Si en el futuro la asociación tiene dominio propio, se cambia a Brevo o similar solo con configuración.

## Pendiente

- ¿La asociación tiene una cuenta de Gmail (u otro correo con SMTP) que se pueda usar? Si no, la opción es crear una.
