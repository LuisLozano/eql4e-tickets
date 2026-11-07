# Protocolo de prueba final · eql4e-tickets

Prueba manual de la v1 (sprints 1 a 3) en producción, `https://tickets-eql4e.ddns.net`, con el móvil y el ordenador. Comprueba lo que las pruebas automáticas no pueden: la cámara, el Excel, varios dispositivos a la vez y la operación de la máquina.

- **Duración estimada**: unas dos horas.
- **Cómo se usa**: sigue los bloques en orden, porque cada uno usa lo que crea el anterior. Marca cada caso con `[x]` si sale lo esperado. Si no, déjalo sin marcar y apúntalo en [Incidencias](#incidencias).
- **Historias y reglas**: entre paréntesis, con su identificador de [04-historias.md](../requisitos/04-historias.md) y [02-roles-permisos.md](../requisitos/02-roles-permisos.md).

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

La app no permite borrar usuarios ni tickets. Para no dejar datos de prueba en producción, se hace una copia de seguridad antes de empezar y se restaura al terminar (caso O-04).

> **Solo si nadie más está usando la app.** Al restaurar se pierde todo lo que se haya guardado durante la prueba, también lo de los socios reales. Si ya hay datos reales, no restaures: al terminar, da de baja a T2, S1 y S2 y anula los tickets de prueba que sigan pendientes.

- [ ] **P-01** Despliega la última versión. Al terminar, el script dice `✔`.
  ```bash
  cd /opt/eql4e-tickets && sudo ./desplegar.sh
  ```
- [ ] **P-02** T1 entra, va a **Usuarios** y abre su ficha. Si sale el aviso «Este es el tesorero inicial, con datos ficticios», cambia el nombre, el teléfono y el email por los reales y pulsa **Guardar cambios**. Sale «Cambios guardados.» y el aviso desaparece (R-06).
  Esto va antes de la copia para que la corrección no se pierda al restaurar.
- [ ] **P-03** Haz la copia de antes de las pruebas. Apunta el nombre de la carpeta que sale en `✔ Copia en …/AAAA-MM-DD_HHMM`.
  ```bash
  cd /opt/eql4e-tickets && sudo ./copia.sh
  ```

## A. Acceso

- [ ] **A-01** T1 da de alta a **T2** con los roles Socio y Tesorero, y a **S1** y **S2** solo como Socio (HU-G01). Tras cada alta sale el aviso del correo desactivado y el «Enlace de activación» con el botón **Copiar enlace**. En el listado aparecen como «Invitado · caduca …», 7 días después de hoy.
- [ ] **A-02** Intenta dar de alta a alguien con el teléfono de S1, escrito de otra forma (`+34 600…` o `0034600…`). Sale «Ya hay un usuario con ese teléfono.».
- [ ] **A-03** Abre en el móvil el enlace de S1, que te habrás enviado por WhatsApp o por correo, sin haber iniciado sesión. Escribe un teléfono equivocado y una contraseña. Sale el error genérico, sin decir qué falla (HU-A01).
- [ ] **A-04** Con el teléfono de S1 y una contraseña de 8 caracteres o más, pulsa **Activar y entrar**. Entra en «Mis tickets».
- [ ] **A-05** Vuelve a abrir el mismo enlace e intenta activar otra vez. Ya no vale.
- [ ] **A-06** Activa también a T2 (en la ventana privada) y a S2 (en el otro navegador).
- [ ] **A-07** S1 pulsa **Salir** y vuelve a entrar con su teléfono y su contraseña (HU-A02).
- [ ] **A-08** S2 escribe mal su contraseña 5 veces seguidas. A la quinta sale «Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.». Al sexto intento, aun con la contraseña buena, sigue sin entrar.
  Lo que sigue no espera a esto: S2 vuelve a entrar al final del bloque S.
- [ ] **A-09** S1 va a **su nombre**, arriba a la derecha, y cambia la contraseña (HU-A03). Una sesión de S1 abierta en otro navegador se cierra; la del móvil sigue abierta.

## S. Socio

Desde el móvil, como S1, salvo que se diga otra cosa.

- [ ] **S-01** **Nuevo ticket** con una **foto hecha con la cámara** del móvil, el importe `12,34`, la fecha de hoy y un concepto (HU-S01). La foto sale en miniatura antes de enviar. Tras **Enviar ticket**, aparece en «Mis tickets» como *Pendiente de autorizar*.
- [ ] **S-02** Abre el ticket: la foto se ve nítida y se puede ampliar (HU-S03). Se ha reducido en el móvil antes de subirla: debería ocupar unos cientos de KB, no varios MB.
- [ ] **S-03** Otro ticket con un **PDF**, el concepto «Otro» con el texto `Floristería`, `8,50` y una fecha de la semana pasada.
- [ ] **S-04** Intenta un ticket con 6 ficheros: no deja añadir el sexto. Con exactamente 5 sí se envía.
- [ ] **S-05** Intenta poner una fecha futura y un importe de `0`. Salen sus errores y no se envía nada.
- [ ] **S-06** En «Mis tickets», el filtro **Pendientes** muestra los tres. Los totales de arriba («Por autorizar», «Por cobrar» y «Cobrado» del año) cuadran (HU-S02).
- [ ] **S-07** Edita el ticket de 12,34 (HU-S04): cambia el importe a `13,00`, quita la foto y pon otra. Al guardar sale «Cambios guardados.». En el historial: el cambio de importe (12,34 € → 13,00 €), «Quitó: …» con enlace a la foto anterior y «Añadió 1 fichero».
- [ ] **S-08** Anula el ticket de 5 ficheros (HU-S05): pulsa **Anular ticket**, sale la pregunta «¿Anular el ticket T-…?» y confírmala. Queda *Anulado* y ya no se puede editar.
- [ ] **S-09** Como **S2**, cuando haya pasado el bloqueo de A-08, entra y envía un ticket de `20,00`. Haz lo mismo como **T2** (es también socio) con uno de `15,00`.

## T. Tesorero

Desde el ordenador, como T1, salvo que se diga otra cosa.

- [ ] **T-01** **Tickets** abre los pendientes de autorizar, lo más antiguo primero (HU-T01). Las casillas de estado cuentan bien.
- [ ] **T-02** Prueba los filtros: socio S1, concepto «Otro», fechas, importe mínimo y máximo. Ordena por importe en los dos sentidos. La URL guarda los filtros: al recargar, siguen puestos.
- [ ] **T-03** Abre el ticket de 13,00 de S1 (HU-T02): se ven el detalle, la foto y el historial con la edición de S-07. **Autoriza** (HU-T03): pasa a *Pendiente de pago*.
- [ ] **T-04** **Rechaza** el de 8,50 sin motivo: no deja (HU-T04). Con el motivo `No se lee la fecha`, sí. Queda *Rechazado*.
- [ ] **T-05** Como **S1**: el ticket rechazado muestra el motivo. **Corregir y reenviar** (HU-S06): cambia la fecha y guarda. Sale «Ticket reenviado. Vuelve a estar pendiente de autorizar.».
- [ ] **T-06** Como **T2**, abre su propio ticket de 15,00: no tiene los botones de autorizar ni de rechazar y sale «Es tu ticket: lo tiene que autorizar o rechazar otro tesorero.» (R-04). T1 sí puede: que lo autorice.
- [ ] **T-07** T1 autoriza el de 20,00 de S2 y el reenviado de S1.
- [ ] **T-08** **Pagos**, en «Por pagar»: S1 tiene 2 tickets. **Pago agrupado** (HU-T05): márcalos los dos, método Transferencia, adjunta un justificante (una foto o un PDF) y pulsa **Registrar pago de …**. El total es la suma de los dos. En el detalle del pago se ven los dos tickets y **Ver justificante** lo abre.
- [ ] **T-09** **Pago individual** de S2 (20,00) por Bizum, sin justificante.
- [ ] **T-10** T2 intenta pagar su propio ticket: no aparece en «Por pagar» y, desde su detalle, sale «Es tu ticket: lo tiene que pagar otro tesorero.» (R-04). T1 se lo paga.
- [ ] **T-11** Como **S1**: sus tickets están *Pagados*, con «Pagado el … por Transferencia», «El pago incluye 2 tickets» y el justificante. En los totales, «cobrado» ha subido.
- [ ] **T-12** **Deshacer un pago** (HU-T06): en el pago de S2, **Deshacer pago…**, escribe un motivo y confirma. Sale «Pago deshecho. El ticket vuelve a Pendiente de pago.». En «Últimos pagos» aparece tachado y con la etiqueta «Deshecho», y S2 ve el motivo en el historial.
- [ ] **T-13** **Deshacer una autorización**: autoriza un ticket pendiente y después pulsa **Deshacer autorización…**. Sin motivo no deja; con motivo vuelve a *Pendiente de autorizar*. **Deshacer un rechazo**: igual, con un ticket rechazado.
- [ ] **T-14** **Exportar CSV** (HU-T07): en **Tickets**, con «Todos» y el socio S1, pulsa **Exportar CSV**. Se descarga `tickets-AAAA-MM-DD.csv`. **Ábrelo con doble clic en el Excel de la asociación**:
  - las columnas salen separadas;
  - los acentos se leen bien;
  - el teléfono sale como `600 000 001`;
  - los importes están alineados a la derecha y `=SUMA()` los suma.

## G. Gestión

Como T1.

- [ ] **G-01** En **Usuarios**, pulsa el nombre de S2 y cambia su nombre y su teléfono (HU-G03). Sale «Cambios guardados.». Pon el teléfono de S1: sale «Ya hay otro usuario con ese teléfono.».
- [ ] **G-02** **Siempre queda un tesorero** (R-03): en la ficha de T2, quita el rol Tesorero y guarda. Al recargar, T2 ya no ve **Pagos**, **Usuarios** ni **Conceptos**. Ahora, en tu propia ficha (T1), quita el rol Tesorero: sale «Es el único tesorero activo…» y no se guarda. En tu ficha tampoco aparece **Dar de baja…**. Devuelve a T2 el rol Tesorero.
- [ ] **G-03** Con S1 con la sesión abierta en el móvil, T1 abre su ficha, pulsa **Dar de baja…** y confirma (R-05). Al recargar en el móvil, S1 está fuera y no puede volver a entrar. Sus tickets siguen en el listado del tesorero.
- [ ] **G-04** **Reactivar** a S1: sale «Usuario reactivado. Puede volver a entrar con su contraseña.» y S1 entra.
- [ ] **G-05** **Ha olvidado la contraseña** (HU-G02): en la ficha de S1, pulsa **Enviar enlace para otra contraseña** y copia el enlace. Hasta que lo use, S1 sigue entrando con su contraseña. Con el enlace elige una nueva: la anterior deja de valer y la sesión del móvil se cierra.
- [ ] **G-06** **Reenviar invitación** a un usuario invitado (da de alta a uno nuevo y no lo actives): el enlace nuevo funciona y el de la invitación anterior ya no.
- [ ] **G-07** **Conceptos** (HU-G04): crea uno, renómbralo, súbelo en la lista y desactívalo. S1 ya no lo ve al crear un ticket, pero un ticket que ya lo tenía lo conserva.

## X. Reglas generales

- [ ] **X-01** **Tickets ajenos** (R-01): copia la URL del detalle de un ticket de S1 (`/tickets/…`) y ábrela como S2: sale «No encontrado». Abre como S1 la URL de un fichero de S2: tampoco. Abre `/gestion/tickets` como S1: «No encontrado».
- [ ] **X-02** **Dos tesoreros a la vez** (E-04): T1 y T2 abren el mismo ticket pendiente de autorizar. T1 lo autoriza y, sin recargar, T2 lo rechaza: sale «Otro tesorero ya lo ha modificado. Revisa cómo está ahora antes de seguir.» y no se rechaza.
- [ ] **X-03** **Móvil**: todas las pantallas del socio y del tesorero se ven bien en vertical, sin desplazamiento lateral, y los botones se pulsan con el dedo.
- [ ] **X-04** **Modo oscuro**: con el móvil en modo oscuro, la app también lo está y todo se lee bien.
- [ ] **X-05** **Acceso directo**: en el móvil, usa «Añadir a pantalla de inicio» y abre la app desde el icono. La v1 no es una PWA instalable: no funciona sin conexión, y es lo esperado.

## O. Operación

- [ ] **O-01** **La copia diaria se ha hecho** (si el equipo estuvo encendido a las 19:30). Tiene que salir «Copia de seguridad de eql4e-tickets» terminada sin error:
  ```bash
  systemctl status eql4e-copia --no-pager
  ```
  ```bash
  sudo ls /mnt/externalHD/eql4e/backups
  ```
- [ ] **O-02** **Simulacro** con la copia de P-03 (cambia la fecha por la que apuntaste). Las cifras corresponden a antes de las pruebas:
  ```bash
  cd /opt/eql4e-tickets && sudo ./restaurar.sh --simulacro AAAA-MM-DD_HHMM
  ```
- [ ] **O-03** Revisa las incidencias apuntadas. Antes de restaurar, saca capturas de lo que haga falta para reproducirlas.
- [ ] **O-04** **Restaurar** la copia de P-03 (solo si nadie más ha usado la app durante la prueba). Pide escribir `eql4e`, hace antes una copia del estado actual y termina con «✔ Restaurada la copia …».
  ```bash
  cd /opt/eql4e-tickets && sudo ./restaurar.sh AAAA-MM-DD_HHMM
  ```
- [ ] **O-05** Tras restaurar: T1 entra con sus datos reales. En **Usuarios** ya no están T2, S1 ni S2, y en **Tickets** no queda ningún ticket de prueba.

## Pendiente del correo real

Mientras `CORREO_MODO=consola`, los enlaces se copian a mano. Cuando se configure el Gmail de la asociación (ADR-0004), repite estos casos con un correo de verdad:

- [ ] **C-01** La invitación llega, no va a spam y su enlace activa la cuenta.
- [ ] **C-02** El correo de «Elige una contraseña nueva en EQL4E Tickets» llega y su enlace funciona.
- [ ] **C-03** Tras un alta o un reenvío, el aviso dice «Invitación enviada a …».

## Incidencias

| Caso | Qué pasó | Dispositivo | Gravedad (bloquea / molesta / detalle) |
|---|---|---|---|
| | | | |
