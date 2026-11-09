# Protocolo de prueba final · eql4e-tickets

Prueba manual de la v1 en producción, `https://tickets-eql4e.ddns.net`, con el móvil y el ordenador: los sprints 1 a 4, la app instalable y el refresco automático. Comprueba lo que las pruebas automáticas no pueden: la cámara, el Excel, varios dispositivos a la vez y la operación de la máquina.

- **Duración estimada**: unas dos horas.
- **Cómo se usa**: sigue los bloques en orden, porque cada uno usa lo que crea el anterior. Marca cada caso con `[x]` si sale lo esperado. Si no, déjalo sin marcar y apúntalo en [Incidencias](#incidencias).
- **Dónde se pulsa**: en **negrita**, el texto del menú, botón, pestaña o campo tal como sale en pantalla. Entre comillas «…», los avisos que tienen que salir, tal cual.
- **Códigos entre paréntesis** (HU-A02, R-04…): la historia o regla que se comprueba. Qué significa cada uno, en el [anexo](#anexo-historias-y-reglas).

### Dónde está cada cosa

- **Menú superior** (al entrar): **Tickets**, **Pagos**, **Usuarios** y **Conceptos**, solo para tesoreros; **Mis tickets**, para socios. En el móvil, el menú va en una fila debajo del logo y se desliza de lado si no cabe.
- **Tu nombre**, arriba a la derecha: abre «Mi cuenta» (cambiar la contraseña). Al lado, **Salir**.
- **Abrir un ticket**: pulsa sobre él en la lista (el número `T-…` o la tarjeta entera). **Volver**: el enlace con la flecha ← de arriba a la izquierda.

## 0. Antes de empezar

### Personas

Hacen falta cuatro usuarios. Una sola persona puede llevarlos todos: usa una ventana del navegador para cada uno (normal, privada, otro navegador, el móvil).

| Quién | Roles | Dispositivo sugerido |
|---|---|---|
| **T1** | Tesorero (el «Tesorero inicial», ya con tus datos reales) | Ordenador |
| **T2** | Tesorero y socio | Ordenador, ventana privada |
| **S1** | Socio | Móvil |
| **S2** | Socio | Ordenador, otro navegador |

Usa teléfonos y emails que no vaya a tener nunca un socio real. Por ejemplo, `600 000 001` con `prueba1@ejemplo.invalid`.

### Datos de prueba: copia antes y restaurar al final

La app no permite borrar usuarios ni tickets. Para no dejar datos de prueba en producción, se hace una copia de seguridad antes de empezar y se restaura al terminar (caso O-05).

> **Solo si nadie más está usando la app.** Al restaurar se pierde todo lo que se haya guardado durante la prueba, también lo de los socios reales. Si ya hay datos reales, no restaures: al terminar, da de baja a T2, S1 y S2 y anula los tickets de prueba que sigan pendientes.

- [ ] **P-01** En un terminal de la máquina, despliega la última versión. Al terminar, el script dice `✔`.
  ```bash
  cd /opt/eql4e-tickets && sudo ./desplegar.sh
  ```
- [ ] **P-02** En el ordenador, abre la app. T1 escribe su **Teléfono** y su **Contraseña** y pulsa **Entrar**. En el menú superior, pulsa **Usuarios** y, en la lista, pulsa sobre su nombre (seguramente «Tesorero inicial») para abrir su ficha. Si sale el aviso «Este es el tesorero inicial, con datos ficticios», cambia **Nombre**, **Teléfono** y **Email** por los reales y pulsa **Guardar cambios**. Sale «Cambios guardados.» y el aviso desaparece (R-06).
  Esto va antes de la copia para que la corrección no se pierda al restaurar.
- [ ] **P-03** En el terminal, haz la copia de antes de las pruebas. Apunta el nombre de la carpeta que sale en `✔ Copia en …/AAAA-MM-DD_HHMM`.
  ```bash
  cd /opt/eql4e-tickets && sudo ./copia.sh
  ```

## A. Acceso

- [ ] **A-01** **Alta de usuarios** (HU-G01). T1 pulsa **Usuarios** en el menú superior y baja hasta el recuadro «Nuevo usuario». Rellena **Nombre**, **Teléfono** y **Email**, marca en **Roles** la casilla **Socio** y la casilla **Tesorero**, y pulsa **Dar de alta y enviar invitación**: es **T2**. Repite con **S1** y con **S2**, marcando solo **Socio**.
  Tras cada alta sale el aviso del correo desactivado y el recuadro «Enlace de activación» con el botón **Copiar enlace**. En la lista de arriba aparecen como «Invitado · caduca …», 7 días después de hoy.
- [ ] **A-02** **Teléfono repetido**. En el mismo recuadro «Nuevo usuario», intenta dar de alta a otra persona con el teléfono de S1 escrito de otra forma (`+34 600…` o `0034600…`) y pulsa **Dar de alta y enviar invitación**. Sale «Ya hay un usuario con ese teléfono.» y no se crea.
- [ ] **A-03** **Enlace de invitación con datos malos** (HU-A01). Pulsa **Copiar enlace** en el alta de S1 y envíatelo al móvil (WhatsApp o correo). En el móvil, sin haber iniciado sesión, ábrelo: sale «Activa tu cuenta». Escribe un **Teléfono** equivocado, una **Contraseña nueva** y **Repite la contraseña**, y pulsa **Activar y entrar**. Sale un error genérico, sin decir qué dato falla.
- [ ] **A-04** **Activar la cuenta**. En la misma pantalla, pon el **Teléfono** de S1 y una contraseña de 8 caracteres o más en los dos campos. Pulsa **Activar y entrar**. Entra directamente en «Mis tickets».
- [ ] **A-05** **El enlace solo vale una vez**. Vuelve a abrir el mismo enlace e intenta activar otra vez. Ya no vale.
- [ ] **A-06** Activa también a T2 (con su enlace, en la ventana privada) y a S2 (en el otro navegador), igual que en A-04.
- [ ] **A-07** **Salir y entrar** (HU-A02). En el móvil, S1 pulsa **Salir** (arriba a la derecha). En la pantalla de entrada escribe su **Teléfono** y su **Contraseña** y pulsa **Entrar**: vuelve a «Mis tickets».
- [ ] **A-08** **Bloqueo por intentos** (HU-A02). En su navegador, S2 pulsa **Salir** y en la pantalla de entrada escribe mal su contraseña 5 veces seguidas, pulsando **Entrar** cada vez. A la quinta sale «Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.». Al sexto intento, aun con la contraseña buena, sigue sin entrar.
  Lo que sigue no espera a esto: S2 vuelve a entrar al final del bloque S.
- [ ] **A-09** **Cambiar la contraseña** (HU-A03). Abre otra sesión de S1 en un navegador del ordenador. En el móvil, S1 pulsa **su nombre** (arriba a la derecha): sale «Mi cuenta». Rellena **Contraseña actual**, **Contraseña nueva** y **Repite la contraseña nueva** y pulsa **Cambiar la contraseña**. Al recargar la página en el ordenador, esa sesión de S1 está cerrada; la del móvil sigue abierta.

## S. Socio

Desde el móvil, como S1, salvo que se diga otra cosa. Todo empieza en **Mis tickets** (menú superior).

- [ ] **S-01** **Ticket con foto** (HU-S01). Pulsa **Nuevo ticket**. En «Fotos del ticket», pulsa **Hacer foto** y fotografía un ticket con la cámara: sale en miniatura. Escribe `12,34` en **Importe (€)**, deja la **Fecha de compra** de hoy y elige un **Concepto**. Pulsa **Enviar ticket**. Vuelve a «Mis tickets» y el ticket sale como *Pendiente de autorizar*.
- [ ] **S-02** **Ver la foto** (HU-S03). Pulsa sobre el ticket de 12,34 €: la foto se ve nítida y se puede ampliar. Se ha reducido en el móvil antes de subirla: debería ocupar unos cientos de KB, no varios MB. Vuelve con **← Mis tickets**.
- [ ] **S-03** **Ticket con PDF y concepto «Otro»**. **Nuevo ticket**. Pulsa **Elegir archivo** y elige un PDF. En **Concepto**, elige **Otro** y escribe `Floristería` en **¿Qué concepto?**. Importe `8,50` y una fecha de la semana pasada. **Enviar ticket**.
- [ ] **S-04** **Máximo 5 ficheros**. **Nuevo ticket**. Con **Hacer foto** o **Elegir archivo**, intenta añadir 6 ficheros: no deja añadir el sexto. Con exactamente 5, rellena el resto y pulsa **Enviar ticket**: se envía.
- [ ] **S-05** **Datos no válidos**. **Nuevo ticket**: pon una **Fecha de compra** futura y un **Importe (€)** de `0` y pulsa **Enviar ticket**. Salen los errores debajo de cada campo y no se envía nada.
- [ ] **S-06** **Filtros y totales** (HU-S02). En «Mis tickets», pulsa la pestaña **Pendientes**: salen los tres tickets enviados. Los totales de arriba («Por autorizar», «Por cobrar» y «Cobrado» del año) cuadran.
- [ ] **S-07** **Editar un ticket pendiente** (HU-S04). Pulsa sobre el ticket de 12,34 € y luego **Editar**. Cambia el importe a `13,00`; en «Fotos del ticket», quita la foto con su botón de quitar (✕) y añade otra con **Hacer foto**. Pulsa **Guardar cambios**: sale «Cambios guardados.». Pulsa **Ver el ticket**: en el «Historial» salen el cambio de importe (12,34 € → 13,00 €), «Quitó: …» con enlace a la foto anterior y «Añadió 1 fichero».
- [ ] **S-08** **Anular** (HU-S05). Vuelve a «Mis tickets», pulsa sobre el ticket de 5 ficheros y pulsa **Anular ticket**. Sale la pregunta «¿Anular el ticket T-…?»: pulsa **Anular ticket** otra vez para confirmar. Queda *Anulado* y ya no sale el botón **Editar**.
- [ ] **S-09** Como **S2**, cuando haya pasado el bloqueo de A-08: entra, pulsa **Nuevo ticket** y envía uno de `20,00`. Haz lo mismo como **T2** (es también socio: en su menú tiene **Mis tickets**) con uno de `15,00`.

## T. Tesorero

Desde el ordenador, como T1, salvo que se diga otra cosa.

- [ ] **T-01** **Listado** (HU-T01). Pulsa **Tickets** en el menú superior: salen los pendientes de autorizar, el más antiguo primero. Las casillas de estado de arriba cuentan bien.
- [ ] **T-02** **Filtros y orden**. Pulsa **Filtros y orden** para desplegarlos. Elige el **Socio** S1, el concepto «Otro», un rango de fechas e importes mínimo y máximo, y pulsa **Aplicar**. Prueba a ordenar por importe en los dos sentidos. La dirección de la página (URL) guarda los filtros: al recargar, siguen puestos.
- [ ] **T-03** **Revisar y autorizar** (HU-T02, HU-T03). En **Tickets**, pulsa sobre el ticket de 13,00 de S1: se ven el detalle, la foto y el «Historial» con la edición de S-07. Pulsa **Autorizar**: sale «Ticket autorizado. Queda pendiente de pago.» y el estado pasa a *Pendiente de pago*.
- [ ] **T-04** **Rechazar** (HU-T04). Vuelve con **← Tickets** y abre el de 8,50. Pulsa **Rechazar** y luego **Confirmar rechazo** sin escribir nada: no deja y pide el motivo. Escribe `No se lee la fecha` en **Motivo del rechazo** y pulsa **Confirmar rechazo**: sale «Ticket rechazado. El socio verá el motivo.» y queda *Rechazado*.
- [ ] **T-05** **Corregir y reenviar** (HU-S06). Como **S1**, en el móvil: en **Mis tickets**, pulsa la pestaña **Rechazados** y abre el ticket. Se ve el «Motivo del rechazo». Pulsa **Corregir y reenviar**, cambia la **Fecha de compra** y pulsa **Guardar y reenviar**. Sale «Ticket reenviado. Vuelve a estar pendiente de autorizar.».
- [ ] **T-06** **No puede revisar sus propios tickets** (R-04). Como **T2**: en **Tickets**, abre su propio ticket de 15,00. No tiene los botones **Autorizar** ni **Rechazar** y sale «Es tu ticket: lo tiene que autorizar o rechazar otro tesorero.». Vuelve con **← Tickets**, marca la casilla de su ticket y la del de 20,00 de S2, y pulsa **Autorizar 2 tickets**: sale «El T-… es tuyo: lo tiene que autorizar otro tesorero. No se ha autorizado ninguno.» y los dos siguen pendientes. Después, T1 abre el ticket de 15,00 de T2 y pulsa **Autorizar**: a él sí le deja.
- [ ] **T-07** **Autorizar varios a la vez** (HU-T03). T1, en **Tickets** (pendientes de autorizar), marca la casilla de la izquierda del de 20,00 de S2 y la del reenviado de S1: sale «2 seleccionados». Pulsa **Autorizar 2 tickets**: sale «2 tickets autorizados. Quedan pendientes de pago.», los dos desaparecen de la lista y el filtro de estado sigue puesto. Con varios tickets en la lista, **Marcar todos** marca todas las casillas de la página y el botón pasa a **Desmarcar todos**.
- [ ] **T-08** **Pago agrupado** (HU-T05). Pulsa **Pagos** en el menú superior. En «Por pagar», S1 sale con 2 tickets: pulsa sobre su fila. En «Tickets que pagas» salen ya marcados los dos. En **Método**, elige **Transferencia**; pulsa **Elegir justificante** y adjunta una foto o un PDF. Pulsa **Registrar pago de …**: el importe es la suma de los dos. En el detalle del pago salen los dos tickets y **Ver justificante** lo abre.
- [ ] **T-09** **Pago individual**. Vuelve a **Pagos** y pulsa sobre la fila de S2 (20,00): su ticket ya sale marcado. Elige **Bizum**, no adjuntes justificante y pulsa **Registrar pago de 20,00 €**.
- [ ] **T-10** **No puede pagar sus propios tickets** (R-04). Como **T2**: en **Pagos**, su ticket no aparece en «Por pagar». Desde **Tickets**, abre su ticket de 15,00: sale «Es tu ticket: lo tiene que pagar otro tesorero.». T1 se lo paga desde **Pagos**, como en T-09.
- [ ] **T-11** **El socio ve el pago**. Como **S1**: en **Mis tickets**, pestaña **Pagados**, salen sus dos tickets. Al abrir uno sale «Pagado el … por Transferencia», «El pago incluye 2 tickets» y **Ver justificante**. En los totales de arriba, «Cobrado» ha subido.
- [ ] **T-12** **Deshacer un pago** (HU-T06). T1, en **Pagos**, baja a «Últimos pagos» y pulsa sobre el pago de S2. Pulsa **Deshacer pago…**, escribe un motivo y pulsa **Deshacer pago** para confirmar. Sale «Pago deshecho. El ticket vuelve a Pendiente de pago.». En «Últimos pagos», ese pago sale tachado y con la etiqueta «Deshecho». S2 ve el motivo en el «Historial» de su ticket.
- [ ] **T-13** **Deshacer una autorización y un rechazo** (HU-T06). En **Tickets**, abre un ticket pendiente y pulsa **Autorizar**. Después pulsa **Deshacer autorización…** y luego **Deshacer autorización** sin motivo: no deja. Escribe un motivo y confirma: vuelve a *Pendiente de autorizar*. Haz lo mismo con un ticket rechazado y **Deshacer rechazo…**.
- [ ] **T-14** **Exportar CSV** (HU-T07). En **Tickets**, pulsa **Filtros y orden**, marca el estado **Todos**, elige el **Socio** S1 y pulsa **Aplicar**. Pulsa **Exportar CSV**: se descarga `tickets-AAAA-MM-DD.csv`. **Ábrelo con doble clic en el Excel de la asociación**:
  - las columnas salen separadas;
  - los acentos se leen bien;
  - el teléfono sale como `600 000 001`;
  - los importes están alineados a la derecha y `=SUMA()` los suma.
- [ ] **T-15** **Pendientes antiguos** (HU-G05). Como **S1**, pulsa **Nuevo ticket** y envía uno de `3,00` con una **Fecha de compra** de hace 19 meses. Como T1, en **Tickets** sale arriba el aviso «Hay 1 ticket pendiente con más de 18 meses…». Pulsa **Verlos**: la lista se filtra hasta esa fecha y sale ese ticket. Ábrelo y recházalo con el motivo `Demasiado antiguo` (como en T-04). Vuelve a **Tickets**: el aviso ya no sale.

## G. Gestión

Como T1, desde **Usuarios** o **Conceptos** en el menú superior.

- [ ] **G-01** **Editar un usuario** (HU-G03). En **Usuarios**, pulsa sobre el nombre de S2. En el recuadro «Datos», cambia **Nombre** y **Teléfono** y pulsa **Guardar cambios**: sale «Cambios guardados.». Ahora pon el teléfono de S1 y pulsa **Guardar cambios**: sale «Ya hay otro usuario con ese teléfono.».
- [ ] **G-02** **Siempre queda un tesorero** (R-03). Abre la ficha de T2, desmarca **Tesorero** en «Roles» y pulsa **Guardar cambios**. Al recargar, T2 ya no tiene **Pagos**, **Usuarios** ni **Conceptos** en el menú. Ahora abre tu propia ficha (T1), desmarca **Tesorero** y pulsa **Guardar cambios**: sale «Es el único tesorero activo…» y no se guarda. En tu ficha tampoco sale **Dar de baja…**. Vuelve a la ficha de T2, marca **Tesorero** y guarda.
- [ ] **G-03** **Dar de baja** (R-05). Con S1 con la sesión abierta en el móvil: T1 abre la ficha de S1 y, en el recuadro «Acceso», pulsa **Dar de baja…**. Sale la pregunta «¿Dar de baja a …?»: pulsa **Dar de baja**. Al recargar en el móvil, S1 está fuera y no puede volver a entrar. Sus tickets siguen saliendo en **Tickets**.
- [ ] **G-04** **Reactivar**. En la ficha de S1, pulsa **Reactivar**: sale «Usuario reactivado. Puede volver a entrar con su contraseña.» y S1 vuelve a entrar en el móvil.
- [ ] **G-05** **Ha olvidado la contraseña** (HU-G02). En la ficha de S1, recuadro «Acceso», pulsa **Enviar enlace para otra contraseña** y luego **Copiar enlace**. Hasta que lo use, S1 sigue entrando con su contraseña. Abre el enlace en otro navegador y elige una contraseña nueva: la anterior deja de valer y la sesión del móvil se cierra.
- [ ] **G-06** **Reenviar invitación** (HU-G02). Da de alta a un usuario nuevo (como en A-01) y no lo actives. Abre su ficha y pulsa **Reenviar invitación**: el enlace nuevo funciona y el de la invitación anterior ya no.
- [ ] **G-07** **Conceptos** (HU-G04). Pulsa **Conceptos** en el menú superior. Escribe un nombre en **Nombre del nuevo concepto** y pulsa **Añadir**. Pulsa **Renombrar** junto a él, escribe el **Nuevo nombre** y pulsa **Guardar**. Súbelo en la lista con la flecha ↑. Desactívalo con su interruptor. Como S1, en **Nuevo ticket** ya no sale entre los conceptos, pero un ticket que ya lo tenía lo conserva.

## X. Reglas generales

- [ ] **X-01** **Tickets ajenos** (R-01). Como S1, abre uno de sus tickets y copia la dirección de la página (`/tickets/…`). Ábrela como S2: sale «No encontrado». Como S1, abre la dirección de un fichero de S2: tampoco. Como S1, escribe `/gestion/tickets` al final de la dirección de la app: «No encontrado».
- [ ] **X-02** **Dos tesoreros a la vez** (E-04). T1 y T2 abren el mismo ticket pendiente de autorizar. T1 pulsa **Autorizar**. Sin recargar, T2 pulsa **Rechazar**, escribe un motivo y pulsa **Confirmar rechazo**: sale «Otro tesorero ya lo ha modificado. Revisa cómo está ahora antes de seguir.» y no se rechaza.
- [ ] **X-03** **Móvil**. Todas las pantallas del socio y del tesorero se ven bien en vertical, sin desplazamiento lateral, y los botones se pulsan con el dedo.
- [ ] **X-04** **Modo oscuro**. Con el móvil en modo oscuro, la app también lo está y todo se lee bien.
- [ ] **X-05** **Instalar la app**: en Android (Chrome), menú ⋮ → **Instalar aplicación** (o «Añadir a pantalla de inicio»); en iPhone (Safari), botón Compartir → **Añadir a pantalla de inicio**. Sale el icono del logo con el nombre «Tickets». Al abrirla desde el icono, se ve a pantalla completa, sin la barra del navegador, y con la sesión iniciada. Sin conexión no funciona: es lo esperado (no hay modo sin conexión).
- [ ] **X-06** **Se actualiza sola**. S1 deja abierta **Mis tickets** en el móvil con un ticket *Pendiente de autorizar* y cambia a otra app (WhatsApp, por ejemplo). T1 autoriza ese ticket. S1 vuelve a la app: el ticket sale ya como *Pendiente de pago*, sin recargar a mano. Si se queda mirando la lista, el cambio también llega solo en unos 2 minutos.

## O. Operación

En un terminal de la máquina.

- [ ] **O-01** **La copia diaria se ha hecho** (si el equipo estuvo encendido a las 19:30). Tiene que salir «Copia de seguridad de eql4e-tickets» terminada sin error, y la misma carpeta de hoy en los dos discos:
  ```bash
  systemctl status eql4e-copia --no-pager
  ```
  ```bash
  sudo ls /mnt/eql4e_copias/backups /mnt/externalHD/eql4e/backups
  ```
- [ ] **O-02** **Tareas diarias** (si la app estuvo en marcha a las 18:55 y a las 19:00): salen una línea `[tareas] purga: …` y otra `[tareas] huerfanos: … revisados, … borrados`, sin errores:
  ```bash
  cd /opt/eql4e-tickets && sudo docker compose logs app | grep tareas
  ```
- [ ] **O-03** **Simulacro** con la copia de P-03 (cambia la fecha por la que apuntaste). Las cifras corresponden a antes de las pruebas:
  ```bash
  cd /opt/eql4e-tickets && sudo ./restaurar.sh --simulacro AAAA-MM-DD_HHMM
  ```
- [ ] **O-04** Revisa las incidencias apuntadas. Antes de restaurar, saca capturas de lo que haga falta para reproducirlas.
- [ ] **O-05** **Restaurar** la copia de P-03 (solo si nadie más ha usado la app durante la prueba). Pide escribir `eql4e`, hace antes una copia del estado actual y termina con «✔ Restaurada la copia …».
  ```bash
  cd /opt/eql4e-tickets && sudo ./restaurar.sh AAAA-MM-DD_HHMM
  ```
- [ ] **O-06** Tras restaurar: T1 entra con sus datos reales. En **Usuarios** ya no están T2, S1 ni S2, y en **Tickets** no queda ningún ticket de prueba.

## Pendiente del correo real

Mientras `CORREO_MODO=consola`, los enlaces se copian a mano con **Copiar enlace**. Cuando se configure el Gmail de la asociación (ADR-0004), repite estos casos con un correo de verdad:

- [ ] **C-01** La invitación llega, no va a spam y su enlace activa la cuenta.
- [ ] **C-02** El correo de «Elige una contraseña nueva en EQL4E Tickets» llega y su enlace funciona.
- [ ] **C-03** Tras un alta o un reenvío, el aviso dice «Invitación enviada a …».

## Incidencias

| Caso | Qué pasó | Dispositivo | Gravedad (bloquea / molesta / detalle) |
|---|---|---|---|
| | | | |

## Anexo: historias y reglas

Resumen de los códigos que salen en los casos. El texto completo está en [04-historias.md](../requisitos/04-historias.md), [02-roles-permisos.md](../requisitos/02-roles-permisos.md) y [03-estados.md](../requisitos/03-estados.md).

### Historias de usuario

| Código | Qué es | Lo esencial |
|---|---|---|
| HU-A01 | Activar cuenta | Con el enlace de invitación, el usuario confirma su teléfono y elige contraseña. El enlace caduca a los 7 días y solo vale una vez. Si algo falla, el error no dice qué dato. |
| HU-A02 | Iniciar sesión | Con teléfono y contraseña. El error no dice cuál de los dos falla. Tras 5 fallos seguidos, 15 minutos bloqueado. La sesión dura 30 días. |
| HU-A03 | Cerrar sesión y cambiar contraseña | **Salir** cierra la sesión. Al cambiar la contraseña se cierran las demás sesiones. |
| HU-S01 | Enviar un ticket | Fotos o PDF (hasta 5), importe, fecha (no futura) y concepto. Las fotos se reducen en el móvil y, si falla la red, el ticket no se pierde. |
| HU-S02 | Ver mis tickets | Lista con pestañas por estado y totales: por autorizar, por cobrar y cobrado del año. |
| HU-S03 | Detalle de un ticket | Datos, ficheros (las fotos se pueden ampliar) e historial. |
| HU-S04 | Editar un ticket pendiente | Solo mientras está pendiente de autorizar. Cada cambio queda en el historial. |
| HU-S05 | Anular un ticket | Pendiente o rechazado, tras confirmar. No se borra: queda *Anulado*. |
| HU-S06 | Corregir y reenviar | Un ticket rechazado se corrige y vuelve a pendiente de autorizar. |
| HU-T01 | Listado global | Todos los tickets, con filtros por estado, socio, concepto, fechas e importe, y orden. Los filtros quedan en la dirección de la página. |
| HU-T02 | Revisar un ticket | El tesorero ve datos, ficheros e historial. |
| HU-T03 | Autorizar | Pasa a pendiente de pago. También varios a la vez desde el listado. |
| HU-T04 | Rechazar | Con motivo obligatorio, que ve el socio. |
| HU-T05 | Registrar un pago | De uno o varios tickets del mismo socio. Método, fecha y justificante opcional. |
| HU-T06 | Deshacer un paso | Autorización, rechazo o pago, con motivo. Solo un paso cada vez. |
| HU-T07 | Exportar a CSV | Lo que se ve en el listado, con sus filtros, listo para el Excel. |
| HU-G01 | Alta de usuario | Solo el tesorero. Se genera la invitación. |
| HU-G02 | Reenviar invitación o restablecer acceso | Nueva invitación, o enlace para elegir otra contraseña. El enlace anterior deja de valer. |
| HU-G03 | Editar y dar de baja | Cambiar datos y roles; baja y reactivación. |
| HU-G04 | Conceptos | Crear, renombrar, ordenar y desactivar. Los tickets antiguos conservan el suyo. |
| HU-G05 | Purga de tickets antiguos | Cada día se borran los tickets cerrados de más de 18 meses. Los pendientes no se borran: un aviso pide resolverlos. |

### Reglas

| Código | Lo esencial |
|---|---|
| R-01 | Un socio solo ve sus tickets y ficheros. Lo ajeno responde «No encontrado», para no revelar que existe. |
| R-03 | Siempre queda al menos un tesorero activo: al último no se le puede quitar el rol ni dar de baja. |
| R-04 | Un tesorero no autoriza, rechaza, paga ni deshace sus propios tickets: lo hace otro tesorero. |
| R-05 | Un usuario de baja no puede entrar. Sus tickets se conservan. |
| R-06 | El primer tesorero lo crea la instalación («Tesorero inicial», con datos ficticios que hay que cambiar). |
| E-04 | Si dos tesoreros actúan a la vez sobre el mismo ticket, gana el primero y el segundo recibe un aviso. |
