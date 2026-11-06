<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { onDestroy } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Fotos } from '#lib/cliente/fotos.svelte.ts';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import CamposTicket from '#lib/componentes/CamposTicket.svelte';
	import { formatoNumeroTicket } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(data.ticket);
	const detalle = $derived(resolve('/tickets/[numero]', { numero: String(t.numero) }));
	// Rechazado: se corrige y vuelve a pendiente de autorizar (HU-S06). Pendiente: se edita (HU-S04).
	const corregir = $derived(t.estado === 'rechazado');

	let quitar = $state<string[]>([]);
	const fotos = new Fotos(() => t.ficheros.filter((f) => !quitar.includes(f.id)).length);
	let sinEnviar = $state(false);

	// Sin borrador local: lo que ya está guardado sigue en el servidor.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		onSubmit({ formData, cancel }) {
			if (fotos.preparando) {
				fotos.aviso = 'Espera a que terminen de prepararse las fotos.';
				return cancel();
			}
			sinEnviar = false;
			fotos.alEnviar(formData);
		},
		onError() {
			sinEnviar = true;
		}
	});

	const errorFicheros = $derived(fotos.aviso ?? $errors.ficheros?._errors?.[0]);
	onDestroy(() => fotos.vaciar());
</script>

<svelte:head
	><title>{corregir ? 'Corregir' : 'Editar'} {formatoNumeroTicket(t.numero)} · Tickets</title
	></svelte:head
>

<main class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
	<a href={detalle} class="inline-flex min-h-11 items-center gap-2 self-start font-bold">
		<ArrowLeft size={20} aria-hidden="true" /><span class="font-mono"
			>{formatoNumeroTicket(t.numero)}</span
		>
	</a>

	<h1 class="font-display text-3xl font-bold">
		{corregir ? 'Corregir' : 'Editar'}
		<span class="font-mono">{formatoNumeroTicket(t.numero)}</span>
	</h1>

	{#if corregir && t.motivoRechazo}
		<section
			aria-labelledby="titulo-motivo"
			class="flex flex-col gap-1 rounded-lg border-l-4 border-rj bg-rj-bg px-4 py-3"
		>
			<h2 id="titulo-motivo" class="font-bold text-rj">Motivo del rechazo</h2>
			<p class="break-words">{t.motivoRechazo}</p>
		</section>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="flex flex-col gap-6"
		novalidate
	>
		<input type="hidden" name="version" value={$form.version} />
		<CamposTicket
			{form}
			errores={$errors}
			{errorFicheros}
			{fotos}
			conceptos={data.conceptos}
			hoy={data.hoy}
			existentes={t.ficheros}
			bind:quitar
		/>

		<!-- Junto al botón: en el móvil es donde se está mirando al pulsar. -->
		{#if $message}
			<Aviso>
				{$message}
				<!-- 409: lo ha cambiado un tesorero (E-04). -->
				{#if page.status === 409}
					<a href={detalle} class="font-bold underline">Ver el ticket</a>
				{/if}
			</Aviso>
		{:else if sinEnviar}
			<Aviso>No se ha podido guardar. Comprueba la conexión y vuelve a intentarlo.</Aviso>
		{/if}
		<div class="flex flex-col gap-2">
			<Boton type="submit" anchoCompleto disabled={$submitting}>
				{#if $submitting}
					Guardando…
				{:else}
					{corregir ? 'Guardar y reenviar' : 'Guardar cambios'}
				{/if}
			</Boton>
			<a
				href={detalle}
				class="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken"
				>Cancelar</a
			>
		</div>
	</form>
</main>
