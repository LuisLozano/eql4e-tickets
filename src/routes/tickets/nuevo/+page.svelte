<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { page } from '$app/state';
	import { borrarBorrador, guardarBorrador, leerBorrador } from '#lib/cliente/borrador.ts';
	import { Fotos } from '#lib/cliente/fotos.svelte.ts';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import CamposTicket from '#lib/componentes/CamposTicket.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Las fotos se guardan en `fotos`, ya comprimidas, y se añaden al envío. Los <input type="file">
	// solo sirven para elegirlas (sin JavaScript, envían lo que tengan, como antes).
	const fotos = new Fotos();
	let recuperado = $state(false);
	let sinEnviar = $state(false);

	// Un borrador por usuario: el móvil puede ser compartido.
	const clave = `ticket-nuevo:${page.data.usuario?.id}`;

	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting, reset } = superForm(data.form, {
		async onSubmit({ formData, cancel }) {
			if (fotos.preparando) {
				fotos.aviso = 'Espera a que terminen de prepararse las fotos.';
				return cancel();
			}
			sinEnviar = false;
			fotos.alEnviar(formData);
			await guardarBorrador(clave, {
				campos: Object.fromEntries(
					(['importe', 'fechaCompra', 'concepto', 'conceptoOtro', 'observaciones'] as const).map(
						(c) => [c, $form[c]]
					)
				),
				ficheros: fotos.elegidos.map((e) => ({
					nombre: e.fichero.name,
					tipo: e.fichero.type,
					antes: e.antes,
					datos: e.fichero
				}))
			});
		},
		async onResult({ result }) {
			if (result.type === 'redirect') await borrarBorrador(clave);
		},
		// Sin conexión (o un error del servidor): el formulario sigue aquí y el borrador, guardado.
		onError() {
			sinEnviar = true;
		}
	});

	const errorFicheros = $derived(fotos.aviso ?? $errors.ficheros?._errors?.[0]);

	async function descartar() {
		await borrarBorrador(clave);
		fotos.vaciar();
		reset();
		recuperado = false;
	}

	onMount(async () => {
		const b = await leerBorrador(clave);
		if (!b) return;
		form.update((f) => ({ ...f, ...b.campos }), { taint: false });
		for (const f of b.ficheros)
			fotos.anadirElegido(new File([f.datos], f.nombre, { type: f.tipo }), f.antes);
		recuperado = true;
	});
	onDestroy(() => fotos.vaciar());
</script>

<svelte:head><title>Nuevo ticket · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Nuevo ticket</h1>

	{#if recuperado && !sinEnviar}
		<Aviso tipo="atencion">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span>Hemos recuperado el ticket que no llegaste a enviar.</span>
				<button type="button" class="underline" onclick={descartar}>Descartar</button>
			</div>
		</Aviso>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="flex flex-col gap-6"
		novalidate
	>
		<CamposTicket
			{form}
			errores={$errors}
			{errorFicheros}
			{fotos}
			conceptos={data.conceptos}
			hoy={data.hoy}
		/>

		<!-- Junto al botón: en el móvil es donde se está mirando al pulsar «Enviar». -->
		{#if sinEnviar}
			<Aviso>
				No se ha podido enviar. Comprueba la conexión y vuelve a intentarlo: el ticket se ha
				guardado en este dispositivo.
			</Aviso>
		{/if}
		<Boton type="submit" anchoCompleto disabled={$submitting}>
			{$submitting ? 'Enviando…' : 'Enviar ticket'}
		</Boton>
	</form>
</main>
