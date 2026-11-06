<script lang="ts">
	import { ArrowLeft, Ban, Pencil } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import DatosTicket from '#lib/componentes/DatosTicket.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import FicherosTicket from '#lib/componentes/FicherosTicket.svelte';
	import HistorialTicket from '#lib/componentes/HistorialTicket.svelte';
	import PagoTicket from '#lib/componentes/PagoTicket.svelte';
	import { formatoFechaHora, formatoNumeroTicket } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(data.ticket);

	// El rechazo vigente: la última entrada «rechazar» del historial (que va de lo último a lo primero).
	const rechazo = $derived(t.historial.find((h) => h.accion === 'rechazar'));

	const editar = $derived(data.acciones.includes('editar') || data.acciones.includes('reenviar'));
	const puedeAnular = $derived(data.acciones.includes('anular'));
	// Tras editar o reenviar se vuelve aquí con ?guardado o ?reenviado.
	const guardado = $derived(page.url.searchParams.has('guardado'));
	const reenviado = $derived(page.url.searchParams.has('reenviado'));

	// Anular no tiene vuelta atrás: se confirma en la propia página (guía de diseño).
	let confirmando = $state(false);
	let enviando = $state(false);
	let pregunta: HTMLElement | undefined = $state();

	async function confirmar() {
		confirmando = true;
		await tick();
		pregunta?.focus();
	}
</script>

<svelte:head><title>{formatoNumeroTicket(t.numero)} · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<a
		href={resolve('/tickets')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold"
	>
		<ArrowLeft size={20} aria-hidden="true" />Mis tickets
	</a>

	<div class="flex flex-wrap items-center gap-3">
		<h1 class="font-display font-mono text-3xl font-bold">{formatoNumeroTicket(t.numero)}</h1>
		<EstadoInsignia estado={t.estado} />
	</div>

	{#if form?.aviso}
		<Aviso tipo="exito">{form.aviso}</Aviso>
	{:else if reenviado}
		<Aviso tipo="exito">Ticket reenviado. Vuelve a estar pendiente de autorizar.</Aviso>
	{:else if guardado}
		<Aviso tipo="exito">Cambios guardados.</Aviso>
	{:else if form?.error}
		<Aviso>{form.error}</Aviso>
	{/if}

	{#if t.estado === 'rechazado' && t.motivoRechazo}
		<section
			aria-labelledby="titulo-motivo"
			class="flex flex-col gap-1 rounded-lg border-l-4 border-rj bg-rj-bg px-4 py-3"
		>
			<h2 id="titulo-motivo" class="font-bold text-rj">Motivo del rechazo</h2>
			<p>{t.motivoRechazo}</p>
			{#if rechazo}
				<p class="text-sm text-muted">{rechazo.nombre} · {formatoFechaHora(rechazo.creadoEn)}</p>
			{/if}
		</section>
	{/if}

	{#if t.pago}
		<PagoTicket pago={t.pago} />
	{/if}

	<FicherosTicket ficheros={t.ficheros} />
	<DatosTicket ticket={t} />

	{#if editar || puedeAnular}
		<section aria-label="Acciones" class="flex flex-col gap-3">
			{#if confirmando}
				<div
					class="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-4 shadow-sm"
				>
					<h2 bind:this={pregunta} tabindex="-1" class="text-xl font-bold">
						¿Anular el ticket {formatoNumeroTicket(t.numero)}?
					</h2>
					<p class="text-muted">
						No se podrá corregir ni reenviar. Quedará en tu lista como <b>Anulado</b>.
					</p>
					<form
						method="POST"
						action="?/anular"
						use:enhance={() => {
							enviando = true;
							return async ({ result, update }) => {
								await update();
								if (result.type === 'failure') await invalidateAll();
								confirmando = enviando = false;
							};
						}}
						class="flex flex-wrap gap-2"
					>
						<input type="hidden" name="version" value={t.version} />
						<Boton type="submit" variante="peligro" disabled={enviando}
							><Ban size={20} aria-hidden="true" />Anular ticket</Boton
						>
						<Boton variante="secundario" onclick={() => (confirmando = false)}>Cancelar</Boton>
					</form>
				</div>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#if editar}
						<a
							href={resolve('/tickets/[numero]/editar', { numero: String(t.numero) })}
							class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 font-bold text-on-ink hover:opacity-90"
							><Pencil size={20} aria-hidden="true" />{t.estado === 'rechazado'
								? 'Corregir y reenviar'
								: 'Editar'}</a
						>
					{/if}
					{#if puedeAnular}
						<Boton variante="secundario" onclick={confirmar}
							><Ban size={20} aria-hidden="true" />Anular ticket</Boton
						>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<HistorialTicket
		historial={t.historial}
		yo={data.yo}
		ficheros={[...t.ficheros, ...t.sustituidos]}
	/>
</main>
