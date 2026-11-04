# 02 · Roles y permisos

> Estado: **v1.0 aprobada**

## Roles

- **Socio**: envía tickets y consulta los suyos.
- **Tesorero**: gestiona socios, conceptos y todos los tickets. Puede haber varios.

Un usuario puede tener **ambos roles** (un tesorero también hace compras y pide reembolso). Ver regla R-04.

## Matriz de permisos

| Acción | Socio | Tesorero |
|---|:-:|:-:|
| Activar su cuenta con código de invitación | ✅ | ✅ |
| Iniciar / cerrar sesión, cambiar su contraseña | ✅ | ✅ |
| Crear ticket | ✅ | ✅ (como socio) |
| Ver **sus** tickets y su historial | ✅ | ✅ |
| Editar / anular **su** ticket en *Pendiente de autorizar* | ✅ | ✅ (solo los suyos) |
| Corregir y reenviar **su** ticket *Rechazado* | ✅ | ✅ (solo los suyos) |
| Ver **todos** los tickets, filtrar, ordenar, exportar CSV | ❌ | ✅ |
| Autorizar / rechazar ticket | ❌ | ✅ (R-04) |
| Registrar pago (individual o agrupado) con justificante | ❌ | ✅ (R-04) |
| Deshacer un cambio de estado | ❌ | ✅ |
| Alta / edición / baja de socios, reenvío de invitación | ❌ | ✅ |
| Asignar o retirar el rol tesorero | ❌ | ✅ (R-03) |
| Gestionar conceptos predefinidos | ❌ | ✅ |

## Reglas

- **R-01** Un socio solo puede acceder a sus propios tickets y ficheros. Cualquier acceso a recursos ajenos devuelve "no encontrado" (no "prohibido"), para no revelar que existen.
- **R-02** La lista de usuarios es cerrada: no hay registro público. Solo un tesorero crea usuarios.
- **R-03** No se puede retirar el rol tesorero al último tesorero activo.
- **R-04** **Separación de funciones**: un tesorero no puede autorizar, rechazar ni pagar sus **propios** tickets; debe hacerlo otro tesorero. Tampoco puede deshacer pasos sobre sus propios tickets.
- **R-05** Un usuario dado de baja no puede iniciar sesión. Sus tickets y su historial se conservan.
- **R-06** El primer tesorero se crea en la instalación (datos iniciales o comando de administración), no desde la interfaz.
