# Requisitos · eql4e-tickets

Aplicación para que los socios de la asociación envíen tickets de compra y los tesoreros los autoricen y registren su pago.

| Documento | Contenido |
|---|---|
| [01-vision.md](01-vision.md) | Problema, objetivo, alcance y glosario |
| [02-roles-permisos.md](02-roles-permisos.md) | Roles, matriz de permisos y reglas |
| [03-estados.md](03-estados.md) | Ciclo de vida del ticket y reglas de pago y deshacer |
| [04-historias.md](04-historias.md) | Historias de usuario con criterios de aceptación |
| [05-no-funcionales.md](05-no-funcionales.md) | Seguridad, RGPD, operación, rendimiento y riesgos |
| [06-backlog.md](06-backlog.md) | Backlog priorizado, línea del MVP y definición de terminado |

## Decisiones tomadas (2026-11-04)

1. Lista cerrada de usuarios; el tesorero los da de alta y la invitación se envía por email con un código.
2. Una única aplicación web responsive (PWA).
3. El socio puede editar o anular mientras el ticket está pendiente; un ticket rechazado se puede corregir y reenviar; el tesorero puede deshacer; hay historial.
4. Pago agrupado de varios tickets de un mismo socio.
5. Listado del tesorero con ordenación, filtros, totales y CSV.
6. Conceptos gestionables, con datos iniciales.
7. Varios tesoreros; sin notificaciones en la v1; copias de seguridad por decidir; compresión de imágenes en el móvil.
8. Dominio: `tickets-eql4e.ddns.net`.
9. Repositorio: `github.com/LuisLozano/eql4e-tickets` (público). Nunca se suben secretos: van en un `.env` excluido de git, con un `.env.example` de muestra.
10. Separación de funciones: un tesorero no actúa sobre sus propios tickets (R-04).
11. El concepto es obligatorio. Conceptos iniciales: Ferretería, Alimentación, Representación y Transporte.
12. Volumen: menos de 200 usuarios y menos de 5.000 tickets al año. Los tickets se conservan **como máximo 5 años** y después se purgan.
13. Añadidos aceptados: estado *Anulado*, fecha de compra y observaciones, de 1 a 5 ficheros (imagen o PDF), deshacer de un solo paso, contraseña en lugar de PIN.
14. El proveedor de email se decide en la Tarea 2.
