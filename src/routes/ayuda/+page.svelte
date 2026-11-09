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
			<li><a class="underline" href="#entrar">Volver a entrar</a></li>
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

	<section id="entrar" aria-labelledby="titulo-entrar" class="flex flex-col gap-4">
		<h2 id="titulo-entrar" class="font-display text-2xl font-bold">4. Volver a entrar</h2>
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
			<li>Si has olvidado la contraseña, pide a un tesorero un enlace para elegir otra.</li>
			<li>
				La app necesita conexión a internet. Si falla la red al enviar un ticket, no se pierde: la
				próxima vez que abras <b>Nuevo ticket</b> lo recuperas.
			</li>
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
