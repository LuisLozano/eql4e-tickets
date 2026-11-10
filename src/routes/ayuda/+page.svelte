<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Manual de usuario (D-01): página pública, para leerla antes de tener cuenta. Las capturas las
	// genera `pnpm manual:capturas`; el PDF, `pnpm manual:pdf`.

	const volver = $derived(page.data.usuario ? resolve('/') : resolve('/entrar'));
</script>

<svelte:head><title>Ayuda · Tickets</title></svelte:head>

<main class="manual mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
	<a
		href={volver}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold print:hidden"
	>
		<ArrowLeft size={20} aria-hidden="true" />Volver
	</a>

	<header class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">Ayuda de EQL4E Tickets</h1>
		<p class="text-muted">
			Para pedir el reembolso de lo que compras para la asociación: haces una foto del ticket, un
			tesorero lo autoriza y te lo paga.
		</p>
	</header>

	<nav aria-labelledby="titulo-indice" class="rounded-lg border border-line bg-surface p-4">
		<h2 id="titulo-indice" class="font-bold">En esta página</h2>
		<ol class="mt-2 list-decimal pl-6">
			<li><a class="underline" href="#empezar">Empezar: activa tu cuenta</a></li>
			<li><a class="underline" href="#android">Instalar la app en Android</a></li>
			<li><a class="underline" href="#iphone">Instalar la app en iPhone</a></li>
			<li><a class="underline" href="#enviar">Enviar un ticket</a></li>
			<li><a class="underline" href="#seguir">Seguir tus tickets</a></li>
			<li><a class="underline" href="#cambiar">Editar o anular un ticket</a></li>
			<li><a class="underline" href="#corregir">Corregir un ticket rechazado</a></li>
			<li><a class="underline" href="#entrar">Volver a entrar y tu contraseña</a></li>
		</ol>
	</nav>

	<section id="empezar" aria-labelledby="titulo-empezar" class="flex flex-col gap-4">
		<h2 id="titulo-empezar" class="font-display text-2xl font-bold">
			1. Empezar: activa tu cuenta
		</h2>
		<p>
			No hay registro: te da de alta un tesorero. Después recibes una <b>invitación</b> con un
			enlace, por WhatsApp o por correo. El enlace vale <b>7 días</b> y solo sirve una vez; si caduca,
			pide otro al tesorero.
		</p>
		<ol class="pasos">
			<li>
				<p>
					<b>Abre el enlace en el móvil</b>, con el navegador: Chrome en Android, Safari en iPhone.
					Si lo abres desde WhatsApp y se queda dentro de WhatsApp, usa su menú para abrirlo en el
					navegador.
				</p>
			</li>
			<li>
				<p>
					Sale <b>«Activa tu cuenta»</b>. El código de invitación ya viene puesto. Escribe tu
					<b>Teléfono</b> (el mismo que diste al tesorero) y elige una contraseña de al menos 8
					caracteres; escríbela dos veces, en <b>Contraseña nueva</b> y <b>Repite la contraseña</b>.
				</p>
				<figure>
					<img
						src="/ayuda/activar.png"
						alt="Pantalla «Activa tu cuenta» con los campos Código de invitación, Teléfono, Contraseña nueva y Repite la contraseña, y el botón Activar y entrar."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					Pulsa <b>Activar y entrar</b>. Ya estás dentro, en <b>«Mis tickets»</b>. Desde aquí envías
					tus tickets con <b>Nuevo ticket</b>.
				</p>
				<figure>
					<img
						src="/ayuda/mis-tickets.png"
						alt="Pantalla «Mis tickets» recién activada: el botón Nuevo ticket y el aviso «Aún no has enviado ningún ticket»."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
		</ol>
		<p>
			Ahora, <b>instala la app</b> en el móvil: tendrás su icono en la pantalla de inicio, como cualquier
			otra aplicación, y no tendrás que buscar el enlace. No hace falta ninguna tienda de aplicaciones.
		</p>
	</section>

	<section id="android" aria-labelledby="titulo-android" class="flex flex-col gap-4">
		<h2 id="titulo-android" class="font-display text-2xl font-bold">
			2. Instalar la app en Android
		</h2>
		<p>Con la app abierta en <b>Chrome</b>, después de activar tu cuenta:</p>
		<ol class="pasos">
			<li>
				<p>Pulsa el menú de Chrome: los <b>tres puntos ⋮</b>, arriba a la derecha.</p>
				<figure>
					<img
						src="/ayuda/android-1.png"
						alt="Ilustración: Chrome con la app abierta y los tres puntos de arriba a la derecha resaltados."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					Pulsa <b>Instalar aplicación</b>. En algunos móviles se llama
					<b>Añadir a pantalla de inicio</b>.
				</p>
				<figure>
					<img
						src="/ayuda/android-2.png"
						alt="Ilustración: el menú de Chrome abierto, con la opción Instalar aplicación resaltada."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>Confirma con <b>Instalar</b>.</p>
				<figure>
					<img
						src="/ayuda/android-3.png"
						alt="Ilustración: el aviso «¿Instalar aplicación?» con el nombre Tickets y el botón Instalar resaltado."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					En la pantalla de inicio aparece el icono <b>Tickets</b>, con el logo de la asociación.
					Ábrela desde ahí: se ve a pantalla completa, sin la barra del navegador, y con tu sesión
					iniciada.
				</p>
				<figure>
					<img
						src="/ayuda/android-4.png"
						alt="Ilustración: la pantalla de inicio del móvil con el icono redondo de Tickets resaltado."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
		</ol>
	</section>

	<section id="iphone" aria-labelledby="titulo-iphone" class="flex flex-col gap-4">
		<h2 id="titulo-iphone" class="font-display text-2xl font-bold">3. Instalar la app en iPhone</h2>
		<p>
			En iPhone solo se puede instalar desde <b>Safari</b>. Si abriste el enlace en otro navegador,
			copia la dirección y ábrela en Safari (tendrás que entrar con tu teléfono y tu contraseña).
		</p>
		<ol class="pasos">
			<li>
				<p>
					Pulsa el botón <b>Compartir</b>: el cuadrado con una flecha hacia arriba, abajo en el
					centro de la pantalla (arriba a la derecha en el iPad).
				</p>
				<figure>
					<img
						src="/ayuda/iphone-1.png"
						alt="Ilustración: Safari con la app abierta y el botón Compartir, abajo en el centro, resaltado."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					Desliza hacia abajo en el menú y pulsa <b>Añadir a pantalla de inicio</b>.
				</p>
				<figure>
					<img
						src="/ayuda/iphone-2.png"
						alt="Ilustración: el menú Compartir de Safari, con la opción Añadir a pantalla de inicio resaltada."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>Deja el nombre <b>Tickets</b> y pulsa <b>Añadir</b>, arriba a la derecha.</p>
				<figure>
					<img
						src="/ayuda/iphone-3.png"
						alt="Ilustración: la pantalla «Añadir a inicio» con el nombre Tickets y el botón Añadir, arriba a la derecha, resaltado."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					En la pantalla de inicio aparece el icono <b>Tickets</b>. Ábrela desde ahí: la primera vez
					puede pedirte entrar con tu teléfono y tu contraseña.
				</p>
				<figure>
					<img
						src="/ayuda/iphone-4.png"
						alt="Ilustración: la pantalla de inicio del iPhone con el icono de Tickets resaltado."
						width="360"
						height="640"
						loading="lazy"
					/>
				</figure>
			</li>
		</ol>
	</section>

	<section id="enviar" aria-labelledby="titulo-enviar" class="flex flex-col gap-4">
		<h2 id="titulo-enviar" class="font-display text-2xl font-bold">4. Enviar un ticket</h2>
		<p>
			Cuando compres algo para la asociación, guarda el ticket o la factura y envíalo desde la app.
			Mejor el mismo día: así no se pierde ni se borra la tinta.
		</p>
		<ol class="pasos">
			<li>
				<p>En <b>«Mis tickets»</b>, pulsa <b>Nuevo ticket</b>.</p>
			</li>
			<li>
				<p>
					Añade la foto: <b>Hacer foto</b> abre la cámara; <b>Elegir archivo</b>, una foto que ya
					tengas o un PDF (una factura electrónica, por ejemplo). Puedes poner hasta 5: si el ticket
					es largo, haz varias fotos. Que se lean bien el comercio, la fecha y el total.
				</p>
			</li>
			<li>
				<p>
					Escribe el <b>Importe (€)</b> total, comprueba la <b>Fecha de compra</b> (viene puesta la
					de hoy) y elige el <b>Concepto</b>. Si no encaja en ninguno, pulsa <b>Otro…</b> y escribe
					qué es en <b>¿Qué concepto?</b>. En <b>Observaciones</b> puedes añadir lo que el tesorero deba
					saber.
				</p>
				<figure>
					<img
						src="/ayuda/nuevo-ticket.png"
						alt="Pantalla «Nuevo ticket» con la foto de un ticket de ferretería añadida, el importe 23,45 y el concepto Ferretería elegido."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					Pulsa <b>Enviar ticket</b>. Vuelves a «Mis tickets» con el aviso «Ticket T-… enviado» y el
					ticket en la lista, <b>Pendiente de autorizar</b>.
				</p>
				<figure>
					<img
						src="/ayuda/ticket-enviado.png"
						alt="Pantalla «Mis tickets» con el aviso de ticket enviado y el ticket de ferretería pendiente de autorizar."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
		</ol>
		<p>
			Si se corta la conexión al enviar, el ticket no se pierde: se queda guardado en el móvil, y la
			próxima vez que abras <b>Nuevo ticket</b> lo recuperas para enviarlo.
		</p>
	</section>

	<section id="seguir" aria-labelledby="titulo-seguir" class="flex flex-col gap-4">
		<h2 id="titulo-seguir" class="font-display text-2xl font-bold">5. Seguir tus tickets</h2>
		<p>
			En <b>«Mis tickets»</b> ves todos los que has enviado, con su estado. Arriba, lo que tienes
			<b>Por autorizar</b>, lo que tienes <b>Por cobrar</b> y lo cobrado este año. Los botones
			<b>Todos</b>, <b>Pendientes</b>, <b>Rechazados</b>… filtran la lista. La pantalla se actualiza
			sola: no hace falta recargarla para ver si te han pagado.
		</p>
		<figure>
			<img
				src="/ayuda/mis-tickets-estados.png"
				alt="Pantalla «Mis tickets» con los totales y cuatro tickets: uno rechazado con su motivo, uno pendiente de pago, uno pagado y uno pendiente de autorizar."
				width="412"
				height="915"
				loading="lazy"
			/>
		</figure>
		<dl class="estados">
			<dt>Pendiente de autorizar</dt>
			<dd>Lo has enviado y un tesorero tiene que revisarlo. Aún puedes editarlo o anularlo.</dd>
			<dt>Pendiente de pago</dt>
			<dd>Un tesorero lo ha autorizado: te lo pagarán, solo o junto con otros tickets.</dd>
			<dt>Pagado</dt>
			<dd>
				Ya te lo han pagado. En el detalle se ve cuándo y cómo (Bizum, transferencia…), con el
				justificante si lo hay.
			</dd>
			<dt>Rechazado</dt>
			<dd>
				Un tesorero ha visto algo que corregir: el motivo sale en la lista y en el detalle. Puedes
				corregirlo y reenviarlo, o anularlo.
			</dd>
			<dt>Anulado</dt>
			<dd>Lo anulaste tú. Se queda en la lista, pero ya no se puede tocar.</dd>
		</dl>
		<p>
			Pulsa un ticket para ver su detalle: las fotos, los datos, el pago y el <b>Historial</b> de todo
			lo que ha pasado con él.
		</p>
	</section>

	<section id="cambiar" aria-labelledby="titulo-cambiar" class="flex flex-col gap-4">
		<h2 id="titulo-cambiar" class="font-display text-2xl font-bold">
			6. Editar o anular un ticket
		</h2>
		<p>Mientras está <b>Pendiente de autorizar</b>, abre el ticket: al final tienes dos botones.</p>
		<ul class="list-disc pl-6">
			<li>
				<b>Editar</b>: cambia el importe, la fecha, el concepto, las observaciones o las fotos, y
				pulsa <b>Guardar cambios</b>.
			</li>
			<li>
				<b>Anular ticket</b>: si lo enviaste por error. Pide confirmación; un ticket anulado no se
				puede recuperar.
			</li>
		</ul>
		<figure>
			<img
				src="/ayuda/ticket-pendiente.png"
				alt="Detalle de un ticket pendiente de autorizar, con su foto, sus datos y los botones Editar y Anular ticket."
				width="412"
				height="915"
				loading="lazy"
			/>
		</figure>
		<p>
			Cuando un tesorero lo autoriza, ya no se puede cambiar. Si hay algún error, díselo a un
			tesorero.
		</p>
	</section>

	<section id="corregir" aria-labelledby="titulo-corregir" class="flex flex-col gap-4">
		<h2 id="titulo-corregir" class="font-display text-2xl font-bold">
			7. Corregir un ticket rechazado
		</h2>
		<ol class="pasos">
			<li>
				<p>
					Abre el ticket <b>Rechazado</b>: arriba está el <b>Motivo del rechazo</b> y quién lo rechazó.
				</p>
				<figure>
					<img
						src="/ayuda/ticket-rechazado.png"
						alt="Detalle de un ticket rechazado: el motivo «En la foto no se lee el total. Haz otra con más luz.», la foto, los datos y los botones Corregir y reenviar y Anular ticket."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
			<li>
				<p>
					Pulsa <b>Corregir y reenviar</b>, cambia lo que te piden (por ejemplo, quita la foto con
					la ✕ y haz otra) y pulsa <b>Guardar y reenviar</b>. El ticket vuelve a estar
					<b>Pendiente de autorizar</b>.
				</p>
				<figure>
					<img
						src="/ayuda/corregir.png"
						alt="Pantalla «Corregir» con el motivo del rechazo arriba, la foto del ticket y los campos para corregir."
						width="412"
						height="915"
						loading="lazy"
					/>
				</figure>
			</li>
		</ol>
		<p>Si no tiene arreglo (por ejemplo, era un gasto personal), pulsa <b>Anular ticket</b>.</p>
	</section>

	<section id="entrar" aria-labelledby="titulo-entrar" class="flex flex-col gap-4">
		<h2 id="titulo-entrar" class="font-display text-2xl font-bold">
			8. Volver a entrar y tu contraseña
		</h2>
		<p>
			La sesión dura 30 días en cada móvil, así que normalmente no tendrás que escribir nada. Si te
			la pide, escribe tu <b>Teléfono</b> y tu <b>Contraseña</b> y pulsa <b>Entrar</b>.
		</p>
		<figure>
			<img
				src="/ayuda/entrar.png"
				alt="Pantalla de entrada con el logo, los campos Teléfono y Contraseña y el botón Entrar."
				width="412"
				height="915"
				loading="lazy"
			/>
		</figure>
		<ul class="list-disc pl-6">
			<li>Si te equivocas 5 veces seguidas, espera 15 minutos antes de volver a probar.</li>
			<li>
				Para <b>cambiar la contraseña</b>, pulsa tu nombre, arriba a la derecha: en «Mi cuenta»
				escribe la actual y dos veces la nueva, y pulsa <b>Cambiar la contraseña</b>. Se cierra la
				sesión en tus otros dispositivos.
			</li>
			<li>
				Si has <b>olvidado la contraseña</b>, pulsa <b>¿Has olvidado tu contraseña?</b> en la pantalla
				de entrada, escribe tu teléfono y te llegará al email un enlace para elegir otra; vale 1 hora.
				Si no aparece esa opción o no te llega el correo, pide el enlace a un tesorero.
			</li>
			<li>La app necesita conexión a internet.</li>
		</ul>
	</section>
</main>

<style>
	.pasos {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-left: 0;
		list-style: none;
		counter-reset: paso;
	}
	/* Numeración propia: en dos columnas (más abajo) el «li» deja de ser un elemento de lista. */
	.pasos > li {
		counter-increment: paso;
	}
	.pasos > li > p::before {
		content: counter(paso) '. ';
		font-weight: bold;
	}
	figure {
		margin-top: 0.75rem;
	}
	.estados {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1rem;
	}
	.estados dt {
		font-weight: bold;
	}
	@media (max-width: 30rem) {
		.estados {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
		.estados dd {
			margin-bottom: 0.5rem;
		}
	}
	figure img {
		width: min(100%, 16rem);
		height: auto;
		border: 1px solid var(--color-line);
		border-radius: 0.75rem;
	}
	/* En pantalla ancha y en papel, el texto del paso a la izquierda y su imagen a la derecha. */
	@media (min-width: 40rem), print {
		.pasos li:has(figure) {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 12rem;
			gap: 1rem;
			align-items: start;
		}
		.pasos figure {
			margin-top: 0;
		}
		.pasos figure img {
			width: 100%;
		}
	}
	@media print {
		.pasos li:has(figure) {
			grid-template-columns: minmax(0, 1fr) 5.5cm;
		}
		li {
			break-inside: avoid;
		}
		h2 {
			break-after: avoid;
		}
	}
</style>
