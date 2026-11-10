<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	// Ayuda del tesorero (D-01): pública como la del socio. Las capturas las genera
	// `pnpm manual:capturas`; el PDF, `pnpm manual:pdf`.

	type Figura = { src: string; alt: string };
	const figuras: Record<string, Figura> = {
		tickets: {
			src: 't-tickets',
			alt: 'Pantalla «Tickets» del tesorero: el botón Exportar CSV, las tarjetas de pendientes de autorizar, de pago y rechazados, Filtros y orden, y la lista de tickets con casillas.'
		},
		revisar: {
			src: 't-revisar',
			alt: 'Detalle de un ticket pendiente de autorizar visto por el tesorero: la foto, el socio, el importe, la fecha, el concepto y los botones Autorizar y Rechazar.'
		},
		rechazar: {
			src: 't-rechazar',
			alt: 'El recuadro «Motivo del rechazo» con un motivo escrito y los botones Confirmar rechazo y Cancelar.'
		},
		varios: {
			src: 't-varios',
			alt: 'Lista de tickets con dos casillas marcadas, el texto «2 seleccionados» y el botón Autorizar 2 tickets.'
		},
		pagos: {
			src: 't-pagos',
			alt: 'Pantalla «Pagos»: en Por pagar, Lucía Martín con 3 tickets y 70,30 €; debajo, los últimos pagos.'
		},
		registrar: {
			src: 't-registrar-pago',
			alt: 'Pantalla «Registrar pago» a Lucía Martín: su IBAN con el botón Copiar IBAN, los tres tickets marcados con el total, la fecha del pago y el método, con Bizum elegido.'
		},
		pago: {
			src: 't-pago',
			alt: 'Detalle de un pago a Lucía Martín recién registrado: importe, fecha, método, quién lo registró y los tickets pagados.'
		},
		filtros: {
			src: 't-filtros',
			alt: 'Filtros y orden abiertos: estado, concepto, socio, fechas de compra e importes.'
		},
		alta: {
			src: 't-alta',
			alt: 'El recuadro «Nuevo usuario» relleno con nombre, teléfono y email, el rol Socio marcado y el botón Dar de alta y enviar invitación.'
		},
		ficha: {
			src: 't-ficha',
			alt: 'Ficha de Lucía Martín: el apartado Cuenta para los pagos con su IBAN y, debajo, Acceso con su estado y los botones Enviar enlace para otra contraseña y Dar de baja.'
		},
		conceptos: {
			src: 't-conceptos',
			alt: 'Pantalla «Conceptos»: la lista con flechas para ordenar, el interruptor de activo y el lápiz para renombrar, y el campo para añadir uno nuevo.'
		}
	};
</script>

{#snippet figura(f: Figura)}
	<figure>
		<img src="/ayuda/{f.src}.png" alt={f.alt} width="412" height="839" loading="lazy" />
	</figure>
{/snippet}

<svelte:head><title>Ayuda del tesorero · Tickets</title></svelte:head>

<main class="manual mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
	<a
		href={resolve('/ayuda')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold print:hidden"
	>
		<ArrowLeft size={20} aria-hidden="true" />Ayuda del socio
	</a>

	<header class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">Ayuda del tesorero</h1>
		<p class="text-muted">
			Revisar y pagar los tickets de los socios, y gestionar usuarios y conceptos. Si además eres
			socio, para tus propios tickets mira la <a class="underline" href={resolve('/ayuda')}
				>ayuda del socio</a
			>: tus tickets los autoriza y te los paga otro tesorero.
		</p>
	</header>

	<nav aria-labelledby="titulo-indice" class="rounded-lg border border-line bg-surface p-4">
		<h2 id="titulo-indice" class="font-bold">En esta página</h2>
		<ol class="mt-2 list-decimal pl-6">
			<li><a class="underline" href="#tickets">La lista de tickets</a></li>
			<li><a class="underline" href="#revisar">Autorizar o rechazar un ticket</a></li>
			<li><a class="underline" href="#varios">Autorizar varios a la vez</a></li>
			<li><a class="underline" href="#pagar">Pagar</a></li>
			<li><a class="underline" href="#deshacer">Deshacer un paso</a></li>
			<li><a class="underline" href="#exportar">Buscar y exportar a CSV</a></li>
			<li><a class="underline" href="#usuarios">Usuarios</a></li>
			<li><a class="underline" href="#conceptos">Conceptos</a></li>
		</ol>
	</nav>

	<section id="tickets" aria-labelledby="titulo-tickets" class="flex flex-col gap-4">
		<h2 id="titulo-tickets" class="font-display text-2xl font-bold">1. La lista de tickets</h2>
		<p>
			Al entrar llegas a <b>Tickets</b>, con los de todos los socios. Arriba, una tarjeta por estado
			con cuántos hay y cuánto suman: <b>Pend. autorizar</b> es tu trabajo pendiente;
			<b>Pend. pago</b>, lo que la asociación debe. Pulsa una tarjeta para ver solo esos. La lista
			se actualiza sola cada pocos minutos.
		</p>
		{@render figura(figuras.tickets)}
		<p>
			Los tickets se borran a los 18 meses de la compra (los datos no se guardan más). Si hay alguno
			pendiente tan antiguo, sale un aviso arriba: los pendientes no se borran, así que resuélvelos.
		</p>
	</section>

	<section id="revisar" aria-labelledby="titulo-revisar" class="flex flex-col gap-4">
		<h2 id="titulo-revisar" class="font-display text-2xl font-bold">
			2. Autorizar o rechazar un ticket
		</h2>
		<ol class="pasos">
			<li>
				<p>
					Pulsa un ticket <b>Pendiente de autorizar</b>. Mira la foto (púlsala para verla entera) y
					comprueba que el importe, la fecha y el concepto coinciden con el ticket.
				</p>
				{@render figura(figuras.revisar)}
			</li>
			<li>
				<p>
					Si está bien, pulsa <b>Autorizar</b>: queda <b>Pendiente de pago</b>. Si no, pulsa
					<b>Rechazar</b>, escribe el <b>Motivo del rechazo</b> (el socio lo verá para corregirlo) y
					pulsa <b>Confirmar rechazo</b>.
				</p>
				{@render figura(figuras.rechazar)}
			</li>
		</ol>
		<p>
			Tus propios tickets no los puedes autorizar, rechazar ni pagar: lo tiene que hacer otro
			tesorero. Todo lo que pasa con un ticket queda en su <b>Historial</b>, con quién y cuándo.
		</p>
	</section>

	<section id="varios" aria-labelledby="titulo-varios" class="flex flex-col gap-4">
		<h2 id="titulo-varios" class="font-display text-2xl font-bold">3. Autorizar varios a la vez</h2>
		<ol class="pasos">
			<li>
				<p>
					En <b>Tickets</b>, marca la casilla de cada ticket que hayas revisado, o pulsa
					<b>Marcar todos</b>. Solo se pueden marcar los pendientes de autorizar que no son tuyos.
				</p>
				{@render figura(figuras.varios)}
			</li>
			<li>
				<p>
					Pulsa <b>Autorizar N tickets</b>. Si alguno ha cambiado mientras tanto (otro tesorero lo
					ha revisado, o el socio lo ha editado), no se autoriza ninguno y te lo dice: revisa la
					lista y vuelve a marcarlos.
				</p>
			</li>
		</ol>
	</section>

	<section id="pagar" aria-labelledby="titulo-pagar" class="flex flex-col gap-4">
		<h2 id="titulo-pagar" class="font-display text-2xl font-bold">4. Pagar</h2>
		<p>Primero haz el pago (Bizum, transferencia o en mano) y después regístralo en la app:</p>
		<ol class="pasos">
			<li>
				<p>
					En el menú, pulsa <b>Pagos</b>. En <b>Por pagar</b> sale cada socio con lo que se le debe. Pulsa
					el socio.
				</p>
				{@render figura(figuras.pagos)}
			</li>
			<li>
				<p>
					En <b>Registrar pago</b> vienen marcados todos sus tickets pendientes de pago; desmarca
					los que no pagues ahora. Comprueba la <b>Fecha del pago</b>, elige el <b>Método</b> y, si
					quieres, añade el <b>Justificante</b> (una captura del Bizum, por ejemplo). Pulsa
					<b>Registrar pago de …</b>.
				</p>
				<p>
					Si el socio ha dejado su IBAN, sale arriba: <b>Copiar IBAN</b> lo copia sin espacios para pegarlo
					en la app del banco al hacer la transferencia. Si no lo ha dejado, sale un aviso con enlace
					a su ficha, donde puedes ponerlo tú.
				</p>
				{@render figura(figuras.registrar)}
			</li>
			<li>
				<p>
					Sale el pago con sus tickets, ya <b>Pagados</b>. El socio ve en cada ticket cuándo y cómo
					se le pagó, y el justificante.
				</p>
				{@render figura(figuras.pago)}
			</li>
		</ol>
		<p>
			También puedes pagar un solo ticket desde su detalle, con <b>Registrar pago</b>. En
			<b>Últimos pagos</b> están los pagos ya hechos.
		</p>
	</section>

	<section id="deshacer" aria-labelledby="titulo-deshacer" class="flex flex-col gap-4">
		<h2 id="titulo-deshacer" class="font-display text-2xl font-bold">5. Deshacer un paso</h2>
		<p>Si te has equivocado, se puede deshacer el último paso, siempre explicando el motivo:</p>
		<ul class="list-disc pl-6">
			<li>
				<b>Deshacer autorización…</b> o <b>Deshacer rechazo…</b>, en el detalle del ticket: vuelve a
				<b>Pendiente de autorizar</b>.
			</li>
			<li>
				<b>Deshacer pago…</b>, en el detalle del pago (desde <b>Últimos pagos</b> o desde el
				ticket): deshace el pago entero y sus tickets vuelven a <b>Pendiente de pago</b>.
			</li>
		</ul>
		<p>Nada se borra: lo deshecho y su motivo quedan en el historial.</p>
	</section>

	<section id="exportar" aria-labelledby="titulo-exportar" class="flex flex-col gap-4">
		<h2 id="titulo-exportar" class="font-display text-2xl font-bold">6. Buscar y exportar a CSV</h2>
		<p>
			En <b>Tickets</b>, abre <b>Filtros y orden</b>: filtra por estado, concepto, socio, fechas de
			compra o importe, elige el orden y pulsa <b>Aplicar</b>.
		</p>
		{@render figura(figuras.filtros)}
		<p>
			<b>Exportar CSV</b> descarga los tickets que estás viendo, con esos filtros, para abrirlos con una
			hoja de cálculo (Excel, LibreOffice…) y hacer las cuentas de la asociación.
		</p>
	</section>

	<section id="usuarios" aria-labelledby="titulo-usuarios" class="flex flex-col gap-4">
		<h2 id="titulo-usuarios" class="font-display text-2xl font-bold">7. Usuarios</h2>
		<ol class="pasos">
			<li>
				<p>
					<b>Dar de alta</b>: en <b>Usuarios</b>, rellena <b>Nuevo usuario</b> con su nombre, su
					teléfono (con el que entrará) y su email, marca sus roles (<b>Socio</b>, <b>Tesorero</b> o
					los dos) y pulsa <b>Dar de alta y enviar invitación</b>.
				</p>
				{@render figura(figuras.alta)}
			</li>
			<li>
				<p>
					Le llega por email un enlace para activar su cuenta, válido 7 días. Además, te sale el
					<b>Enlace de activación</b> con el botón <b>Copiar enlace</b>, por si prefieres mandárselo
					por WhatsApp o el correo no le llega. Solo se ve en ese momento.
				</p>
			</li>
			<li>
				<p>
					Pulsa un usuario para abrir su ficha. En <b>Datos</b> puedes cambiar su nombre, teléfono,
					email y roles. En <b>Cuenta para los pagos</b>, el IBAN de un socio, por si te lo da de
					palabra (normalmente lo pone él al activar su cuenta o en «Mi cuenta»). En <b>Acceso</b>:
				</p>
				<ul class="mt-2 list-disc pl-6">
					<li>
						<b>Reenviar invitación</b> si no la activó a tiempo, o
						<b>Enviar enlace para otra contraseña</b> si ya la había activado y la ha olvidado.
					</li>
					<li>
						<b>Dar de baja…</b>: ya no puede entrar, pero sus tickets se conservan; su IBAN se
						borra. <b>Reactivar</b> lo deshace.
					</li>
				</ul>
				{@render figura(figuras.ficha)}
			</li>
		</ol>
		<p>
			Siempre tiene que quedar al menos un tesorero activo: al último no se le puede dar de baja.
		</p>
	</section>

	<section id="conceptos" aria-labelledby="titulo-conceptos" class="flex flex-col gap-4">
		<h2 id="titulo-conceptos" class="font-display text-2xl font-bold">8. Conceptos</h2>
		<p>
			Son las opciones que eligen los socios al enviar un ticket. En <b>Conceptos</b> puedes:
		</p>
		<ul class="list-disc pl-6">
			<li>añadir uno, escribiendo su nombre y pulsando <b>Añadir</b>;</li>
			<li>renombrarlo con el lápiz;</li>
			<li>cambiar el orden en que salen, con las flechas;</li>
			<li>
				desactivarlo con su interruptor: deja de ofrecerse, pero los tickets que ya lo tienen lo
				conservan.
			</li>
		</ul>
		{@render figura(figuras.conceptos)}
		<p><b>Otro…</b> siempre aparece al final, para lo que no encaja en ninguno.</p>
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
	.pasos > li > p:first-child::before {
		content: counter(paso) '. ';
		font-weight: bold;
	}
	figure {
		margin-top: 0.75rem;
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
		.pasos li:has(figure) > :not(figure) {
			grid-column: 1;
		}
		.pasos li:has(figure) > figure {
			grid-column: 2;
			grid-row: 1 / span 3;
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
