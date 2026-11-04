# 04 · Historias de usuario

> Estado: **v1.0 aprobada** · Prioridad MoSCoW entre corchetes: **[M]** imprescindible, **[S]** importante, **[C]** deseable.
> Los criterios usan el formato *Dado / Cuando / Entonces*. Solo se detallan los casos relevantes; las validaciones comunes están en la sección final.

---

## A · Acceso

### HU-A01 · Activar cuenta [M]
**Como** socio invitado **quiero** activar mi cuenta con el código recibido por email **para** poder usar la app.

- **Dado** un código válido y no caducado, **cuando** introduzco mi teléfono, el código y una contraseña válida, **entonces** la cuenta queda activa, el código se invalida y entro en la app.
- **Dado** un código caducado (más de 7 días), ya usado o que no corresponde a ese teléfono, **entonces** se muestra un error genérico ("código no válido") y no se activa nada.
- El email contiene un enlace que abre la pantalla de activación con el código ya rellenado.

### HU-A02 · Iniciar sesión [M]
**Como** usuario **quiero** entrar con mi teléfono y contraseña **para** acceder a mis funciones.

- **Dado** credenciales correctas, **entonces** entro y veo la pantalla de inicio según mi rol (socio: "Mis tickets"; tesorero: "Todos los tickets").
- **Dado** credenciales incorrectas, **entonces** el error no indica cuál de los dos datos falla.
- **Dado** 5 intentos fallidos seguidos en 15 minutos, **entonces** la cuenta se bloquea temporalmente 15 minutos.
- La sesión dura **30 días** en el dispositivo (para no pedir la contraseña al socio en cada compra) salvo que cierre sesión.

### HU-A03 · Cerrar sesión y cambiar contraseña [M]
- Puedo cerrar sesión desde cualquier pantalla.
- Puedo cambiar la contraseña indicando la actual. Al cambiarla se cierran mis otras sesiones.

### HU-A04 · He olvidado mi contraseña [S]
- **Dado** mi teléfono, **cuando** pido restablecer, **entonces** recibo en mi email un enlace de un solo uso válido 1 hora. La pantalla responde igual exista o no el teléfono.
- Alternativa siempre disponible: un tesorero reenvía la invitación (HU-G02).

---

## S · Socio

### HU-S01 · Enviar un ticket [M]
**Como** socio **quiero** fotografiar un ticket y enviarlo con su importe **para** que me lo reembolsen.

- Puedo **hacer una foto** con la cámara o **elegir** imágenes o PDF del dispositivo: de **1 a 5 ficheros** (tickets largos, facturas electrónicas).
- Las imágenes se **comprimen en el dispositivo** antes de subirse (lado mayor ≤ 2000 px, JPEG o WebP).
- Campos:
  - **Importe** (obligatorio): mayor que 0, 2 decimales como máximo, en euros.
  - **Fecha de compra** (obligatoria): por defecto hoy, no puede ser futura.
  - **Concepto** (obligatorio): lista de conceptos activos + "Otro"; si elijo "Otro", el texto libre es obligatorio (máximo 100 caracteres).
  - **Observaciones** (opcional, máximo 500 caracteres).
- **Dado** el formulario válido, **cuando** envío, **entonces** el ticket se crea en *Pendiente de autorizar* y vuelvo a "Mis tickets" con un mensaje de confirmación.
- **Dado** que se pierde la conexión durante el envío, **entonces** se muestra un error y **no se pierden** los datos ni las fotos del formulario; puedo reintentar.
- No hace falta indicar mi teléfono: el ticket se asocia al usuario con sesión iniciada.

### HU-S02 · Ver mis tickets [M]
- Lista con fecha de compra, importe, concepto y estado (con color por estado), más reciente primero.
- Filtro por estado.
- Totales arriba: importe *pendiente de autorizar*, *pendiente de pago* y *pagado en el año en curso*.
- Solo veo mis tickets (R-01).

### HU-S03 · Ver el detalle de un ticket [M]
- Veo los ficheros (con ampliación), los datos, el estado actual y el **historial** completo.
- Si está *Rechazado*, el **motivo** se muestra destacado.
- Si está *Pagado*, veo la fecha y el método de pago y puedo ver el justificante.

### HU-S04 · Editar un ticket pendiente [M]
- **Dado** un ticket mío en *Pendiente de autorizar*, puedo cambiar ficheros, importe, fecha, concepto y observaciones. El cambio queda en el historial.
- **Dado** que un tesorero lo ha autorizado o rechazado mientras yo editaba, **entonces** al guardar se me avisa y no se aplica (E-04).

### HU-S05 · Anular un ticket [M]
- **Dado** un ticket mío en *Pendiente de autorizar* o *Rechazado*, puedo anularlo tras confirmar. Pasa a *Anulado* y ya no se puede modificar.

### HU-S06 · Corregir y reenviar un ticket rechazado [M]
- **Dado** un ticket mío *Rechazado*, puedo modificar sus datos y ficheros y **reenviarlo**; vuelve a *Pendiente de autorizar*.
- El historial conserva el rechazo anterior y su motivo.

---

## T · Tesorero

### HU-T01 · Listado global de tickets [M]
**Como** tesorero **quiero** ver todos los tickets **para** saber qué hay que revisar y pagar.

- Columnas: fecha de compra, socio, concepto, importe, estado y fecha de envío.
- **Ordenación** por estado, concepto, socio, importe y fechas (ascendente/descendente). Por defecto: por estado (*Pend. autorizar* → *Pend. pago* → *Rechazado* → *Pagado* → *Anulado*) y, dentro de cada uno, por fecha de envío ascendente (lo más antiguo primero).
- **Filtros** combinables: estado (varios), concepto, socio, rango de fechas e importe mínimo/máximo.
- **Totales** del resultado filtrado: número de tickets e importe, desglosado por estado.
- Paginación a partir de 50 filas.
- En ordenador se ve como tabla; en móvil, como lista de tarjetas.

### HU-T02 · Revisar un ticket [M]
- Veo el detalle, los ficheros a tamaño completo (zoom, girar imagen) y el historial.
- Desde el detalle puedo ejecutar las acciones permitidas según el estado (ver 03-estados).

### HU-T03 · Autorizar ticket [M]
- **Dado** un ticket en *Pendiente de autorizar* que no es mío (R-04), **cuando** lo autorizo, **entonces** pasa a *Pendiente de pago*.
- **[C]** Autorización múltiple: seleccionar varios desde el listado y autorizarlos de una vez.

### HU-T04 · Rechazar ticket [M]
- **Dado** un ticket en *Pendiente de autorizar*, **cuando** lo rechazo, **entonces** debo indicar un **motivo** (entre 5 y 500 caracteres) y pasa a *Rechazado*.

### HU-T05 · Registrar un pago (individual o agrupado) [M]
**Como** tesorero **quiero** registrar que he pagado uno o varios tickets de un socio con un solo Bizum o transferencia.

- Elijo un socio y veo sus tickets en *Pendiente de pago*, con el total. Puedo marcar todos o algunos.
- Indico la **fecha de pago** (por defecto hoy) y el **método** (Bizum, transferencia, efectivo u otro), y opcionalmente adjunto un **justificante** (imagen o PDF, 1 fichero).
- **Entonces** se crea un Pago con el importe total calculado y todos los tickets seleccionados pasan a *Pagado*.
- No se pueden mezclar tickets de socios distintos en un Pago (E-02).
- También se puede iniciar desde el detalle de un ticket (Pago de un solo ticket).

### HU-T06 · Deshacer un paso [M]
- Desde el detalle del ticket puedo deshacer el **último** cambio hecho por un tesorero (D1, D2, D3), indicando un **motivo** obligatorio.
- Deshacer un pago afecta a **todos** los tickets de ese Pago; antes de confirmar se muestra la lista (E-03).

### HU-T07 · Exportar a CSV [S]
- Exporto el listado **con los filtros aplicados**: id, fechas, socio, teléfono, concepto, importe, estado, fecha y método de pago.
- Formato compatible con Excel en español: separador `;`, coma decimal, UTF-8 con BOM.

---

## G · Gestión (tesorero)

### HU-G01 · Alta de socio [M]
- Datos: **nombre** (obligatorio), **teléfono** (obligatorio, único, se normaliza a formato +34…), **email** (obligatorio) y **roles** (socio por defecto; opcionalmente tesorero).
- Al guardar se genera un código de invitación (válido 7 días) y se **envía por email**.
- **Dado** un teléfono o email ya existente, **entonces** se muestra un error.

### HU-G02 · Reenviar invitación / restablecer acceso [M]
- Genera un código nuevo (los anteriores dejan de valer) y lo envía por email. Si el usuario ya estaba activo, su contraseña deja de valer al usar el nuevo código.
- Si el email no sale (fallo de correo), el tesorero puede **copiar el enlace** de activación para enviarlo por otro canal.

### HU-G03 · Editar y dar de baja socios [M]
- Puedo editar nombre, teléfono, email y roles (con R-03).
- Puedo dar de baja y reactivar. La baja cierra sus sesiones; sus tickets se conservan (R-05).
- Listado de usuarios con estado: *invitado*, *activo* o *baja*.

### HU-G04 · Gestionar conceptos [M]
- Crear, renombrar, reordenar y **desactivar** conceptos. Un concepto usado por algún ticket no se borra, solo se desactiva (deja de ofrecerse, pero los tickets lo conservan).
- Datos iniciales: *Ferretería*, *Alimentación*, *Representación*, *Transporte*.

### HU-G05 · Purga de tickets antiguos [S]
**Como** asociación **quiero** que los tickets se eliminen pasados 18 meses **para** cumplir el periodo máximo de conservación (RNF-22).

- Un proceso automático (mensual) elimina **definitivamente** los tickets en estado *Pagado*, *Rechazado* o *Anulado* cuya **fecha de compra** tenga más de 18 meses: datos, ficheros e historial.
- Un Pago se elimina cuando ya no le queda ningún ticket, junto con su justificante.
- Los tickets en *Pendiente de autorizar* o *Pendiente de pago* **no** se eliminan; aparecen en un aviso al tesorero para que los resuelva.
- Cada ejecución queda registrada en el log con el número de tickets eliminados, sin datos personales.

---

## Validaciones y comportamientos comunes

- **Ficheros**: JPEG, PNG, WebP, HEIC (el móvil lo convierte al comprimir) y PDF. Máximo **10 MB por fichero** tras la compresión. Se comprueba el tipo real del contenido, no solo la extensión.
- **Importes**: euros con 2 decimales, mostrados con formato español (`1.234,56 €`).
- **Fechas**: zona horaria Europe/Madrid.
- **Concurrencia**: ver E-04.
- **Accesibilidad**: los estados no se distinguen solo por color (también texto o icono).
