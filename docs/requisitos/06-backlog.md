# 06 · Backlog priorizado

> Estado: **v1.0 aprobada** · Las estimaciones (puntos) se hacen tras fijar la arquitectura (Tarea 2).

## Línea del MVP

Todo lo marcado **[M]** forma el MVP: con ello la asociación puede dejar de gestionar tickets por mensajería.

| Orden | Historia | Prioridad | Sprint propuesto |
|---:|---|:-:|:-:|
| 1 | HU-G01 Alta de socio (incluye envío de email) | M | S1 |
| 2 | HU-A01 Activar cuenta | M | S1 |
| 3 | HU-A02 Iniciar sesión | M | S1 |
| 4 | HU-A03 Cerrar sesión / cambiar contraseña | M | S1 |
| 5 | HU-G04 Gestionar conceptos (+ datos iniciales) | M | S1 |
| 6 | HU-S01 Enviar ticket | M | S1 |
| 7 | HU-S02 Ver mis tickets | M | S1 |
| 8 | HU-S03 Detalle de ticket | M | S1 |
| 9 | HU-T01 Listado global | M | S2 |
| 10 | HU-T02 Revisar ticket | M | S2 |
| 11 | HU-T03 Autorizar | M | S2 |
| 12 | HU-T04 Rechazar | M | S2 |
| 13 | HU-S04 Editar ticket pendiente | M | S2 |
| 14 | HU-S05 Anular ticket | M | S2 |
| 15 | HU-S06 Corregir y reenviar | M | S2 |
| 16 | HU-T05 Registrar pago (individual / agrupado) | M | S3 |
| 17 | HU-T06 Deshacer un paso | M | S3 |
| 18 | HU-G02 Reenviar invitación | M | S3 |
| 19 | HU-G03 Editar / baja de socios | M | S3 |
| — | ***Línea del MVP*** | | |
| 20 | HU-T07 Exportar CSV | S | S3 |
| 21 | HU-A04 He olvidado mi contraseña | S | S4 |
| 22 | HU-G05 Purga de tickets de más de 18 meses | S | S4 |
| 23 | HU-T03 Autorización múltiple | C | S4 |

## Deuda pendiente

### D-01 · Manuales de usuario y de administrador (documentación)

Falta documentación para quien usa y quien mantiene la app. Sin sprint asignado.

- **Manual de usuario**, en dos formatos con el mismo contenido:
  - **HTML accesible desde la propia aplicación** (por ejemplo, un enlace «Ayuda» en la cabecera), sin necesidad de iniciar sesión para leerlo.
  - **PDF**, para imprimir o enviar.
  - Cubre al socio (activar la cuenta, enviar, editar, anular y corregir tickets, instalar la app en el móvil) y al tesorero (revisar, autorizar varios, rechazar, pagar, deshacer, exportar CSV, usuarios y conceptos).
- **Manual de administrador**, solo en **PDF**:
  - **Todos los scripts y unidades, con su ruta y lo que hacen**: `deploy/desplegar.sh`, `deploy/copia.sh`, `deploy/restaurar.sh` (y su `--simulacro`), `deploy/eql4e-copia.service` y `deploy/eql4e-copia.timer`, `scripts/migrar.js`, y dónde quedan instalados en la máquina (`/opt/eql4e-tickets`, `/etc/systemd/system`).
  - Las tareas programadas de la app (purga a las 18:55, huérfanos a las 19:00) y la copia de las 19:30.
  - Instalación, despliegue, copias y restauración, el tesorero inicial (R-06), la configuración de `.env` (correo incluido) y cómo leer los logs.
- **Hecho cuando**: los dos PDF se generan desde el repositorio (no a mano) y el HTML se sirve en producción.

## Siguientes versiones (fuera de la v1)

- Notificaciones de cambio de estado (email o push).
- ~~Política y automatización de copias de seguridad~~: hecha ([ADR-0008](../arquitectura/adr/0008-copias.md)). Falta una copia fuera de casa.
- Informes por concepto o periodo.
- OCR para proponer automáticamente importe y fecha.

## Definición de terminado (DoD) por historia

1. Se cumplen sus criterios de aceptación.
2. Hay pruebas automáticas de la lógica y los permisos, y la integración continua está en verde.
3. Funciona en un móvil (Android o iOS) y en un ordenador.
4. Está desplegada en el entorno de la máquina y verificada.
5. La documentación se ha actualizado si cambia algo de los requisitos.
