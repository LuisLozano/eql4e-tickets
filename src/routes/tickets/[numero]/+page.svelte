<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import DatosTicket from '#lib/componentes/DatosTicket.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import FicherosTicket from '#lib/componentes/FicherosTicket.svelte';
	import HistorialTicket from '#lib/componentes/HistorialTicket.svelte';
	import { formatoFechaHora, formatoNumeroTicket } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(data.ticket);

	// El rechazo vigente: la última entrada «rechazar» del historial (que va de lo último a lo primero).
	const rechazo = $derived(t.historial.find((h) => h.accion === 'rechazar'));
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

	<FicherosTicket ficheros={t.ficheros} />
	<DatosTicket ticket={t} />
	<HistorialTicket historial={t.historial} yo={data.yo} />
</main>
