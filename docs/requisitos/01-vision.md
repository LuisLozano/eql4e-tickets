# 01 · Visión del producto

> Estado: **v1.0 aprobada** · Fecha: 2026-11-04

## Problema

Los socios de la asociación adelantan dinero en compras para la asociación y entregan los tickets al tesorero de forma informal (fotos por mensajería, papel). Esto provoca tickets perdidos, pagos duplicados y ninguna trazabilidad de qué se ha autorizado, rechazado o pagado.

## Objetivo

Una aplicación web única y adaptable (PWA responsive) en la que:

- El **socio** fotografía el ticket desde el móvil, indica importe y concepto, y sigue el estado de su reembolso.
- El **tesorero** revisa, autoriza o rechaza, registra el pago (con justificante) y tiene una visión global de lo pendiente.
- Todo cambio queda registrado en un **historial auditable**.

## Usuarios

| Perfil | Dispositivo principal | Frecuencia |
|---|---|---|
| Socio | Móvil | Esporádica (cuando hace una compra) |
| Tesorero (varios) | Ordenador (también móvil) | Semanal |

## Alcance de la versión 1 (MVP)

- Alta de socios por un tesorero e invitación por email con código de activación.
- Acceso con teléfono + contraseña.
- Envío, edición, anulación y reenvío de tickets por el socio.
- Autorización, rechazo, pago (individual y agrupado) y corrección de errores por el tesorero.
- Listado de tickets con filtros, ordenación, totales y exportación CSV.
- Gestión de conceptos predefinidos.
- Historial de cambios de estado.

## Fuera de alcance (v1)

- Notificaciones (email, push, Telegram) de cambios de estado. *El email de invitación sí entra: es parte del alta.*
- Ejecución del pago desde la app (el pago se hace fuera: Bizum o transferencia).
- Lectura automática del ticket (OCR).
- Contabilidad, presupuestos por partida, informes avanzados.
- Política de copias de seguridad (se decide más adelante; ver no funcionales).
- Aplicación nativa (iOS / Android).

## Indicadores de éxito

- El 100 % de los reembolsos de la asociación pasan por la app.
- Un socio sube un ticket en menos de 1 minuto desde el móvil.
- El tesorero conoce en todo momento el importe pendiente de pago.

## Glosario

| Término | Definición |
|---|---|
| Ticket | Solicitud de reembolso: uno o varios ficheros del justificante de compra + importe + concepto. |
| Concepto | Categoría del gasto. Hay una lista predefinida gestionable y la opción "Otro" con texto libre. |
| Justificante de pago | Fichero (imagen de Bizum o PDF de transferencia) que acredita que el tesorero ha pagado. |
| Pago | Registro de que uno o varios tickets de un mismo socio se han abonado. |
| Invitación | Código de un solo uso, con caducidad, que permite al socio activar su cuenta. |
