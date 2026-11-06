<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import { formatoDia, formatoImporte, formatoNumeroTicket } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Tras enviar un ticket se vuelve aquí con ?enviado=<número> (HU-S01); tras activar la cuenta, con ?bienvenida.
	const enviado = $derived(Number(page.url.searchParams.get('enviado')) || null);
	const bienvenida = $derived(page.url.searchParams.has('bienvenida'));
	const nombre = $derived(page.data.usuario?.nombre.split(' ')[0]);

	const lista = resolve('/tickets');
	const filtros = [
		{ valor: null, texto: 'Todos' },
		{ valor: 'pendientes', texto: 'Pendientes' },
		{ valor: 'rechazado', texto: 'Rechazados' },
		{ valor: 'pagado', texto: 'Pagados' },
		{ valor: 'anulado', texto: 'Anulados' }
	] as const;
	const totales = $derived([
		{ texto: 'Por autorizar', centimos: data.totales.porAutorizar },
		{ texto: 'Por cobrar', centimos: data.totales.porCobrar },
		{ texto: `Cobrado ${data.anio}`, centimos: data.totales.cobrado }
	]);
</script>

<svelte:head><title>Mis tickets · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
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
	{:else if bienvenida}
		<Aviso tipo="exito">Cuenta activada. Te damos la bienvenida, {nombre}.</Aviso>
	{/if}

	{#if data.tickets.length || data.filtro}
		<dl class="grid grid-cols-3 gap-2">
			{#each totales as t (t.texto)}
				<div class="flex flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2">
					<dt class="text-sm text-muted">{t.texto}</dt>
					<dd class="font-mono font-bold tabular-nums">{formatoImporte(t.centimos)}</dd>
				</div>
			{/each}
		</dl>

		<nav aria-label="Filtrar por estado" class="-mx-4 overflow-x-auto px-4">
			<ul class="flex gap-2">
				{#each filtros as f (f.texto)}
					<li>
						<a
							href="{lista}{f.valor ? `?estado=${f.valor}` : ''}"
							aria-current={data.filtro === f.valor ? 'page' : undefined}
							class="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-bold whitespace-nowrap aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-on-ink"
							>{f.texto}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		{#if data.tickets.length}
			<ul class="flex flex-col gap-2" aria-label="Tickets">
				{#each data.tickets as t (t.numero)}
					<li>
						<a
							href={resolve('/tickets/[numero]', { numero: String(t.numero) })}
							class="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-sunken"
						>
							<span class="flex items-baseline justify-between gap-3">
								<span class="min-w-0 font-bold break-words">{t.concepto}</span>
								<span class="font-mono font-bold whitespace-nowrap tabular-nums"
									>{formatoImporte(t.importeCentimos)}</span
								>
							</span>
							<span class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
								<span>
									<span class="font-mono">{formatoNumeroTicket(t.numero)}</span> · Compra {formatoDia(
										t.fechaCompra
									)}
								</span>
								<EstadoInsignia estado={t.estado} />
							</span>
							{#if t.estado === 'rechazado' && t.motivoRechazo}
								<span class="truncate text-sm text-rj">{t.motivoRechazo}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted">No hay tickets con este estado.</p>
		{/if}
	{:else}
		<div
			class="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center"
		>
			<h2 class="font-display text-xl font-bold">Aún no has enviado ningún ticket</h2>
			<p class="max-w-prose text-muted">
				Cuando compres algo para la asociación, haz una foto al ticket y envíalo desde aquí. Te lo
				reembolsará un tesorero.
			</p>
		</div>
	{/if}
</main>
