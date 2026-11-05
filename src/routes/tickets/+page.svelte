<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import { formatoNumeroTicket } from '#lib/formato.ts';

	// Tras enviar un ticket se vuelve aquí con ?enviado=<número> (HU-S01).
	const enviado = $derived(Number(page.url.searchParams.get('enviado')) || null);
</script>

<svelte:head><title>Mis tickets · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="font-display text-3xl font-bold">Mis tickets</h1>
		<a
			href={resolve('/tickets/nuevo')}
			class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-on-ink hover:opacity-90"
			><Plus size={20} aria-hidden="true" />Nuevo ticket</a
		>
	</div>
	{#if enviado}
		<Aviso tipo="exito">
			Ticket {formatoNumeroTicket(enviado)} enviado. Queda pendiente de que un tesorero lo autorice.
		</Aviso>
	{/if}
	<p class="text-muted">Aquí verás tus tickets y su estado. La lista llega muy pronto.</p>
</main>
