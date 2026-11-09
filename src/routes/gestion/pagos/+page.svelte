<script lang="ts">
	import { ChevronRight, Euro } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { formatoDia, formatoImporte } from '#lib/formato.ts';
	import { TEXTO_METODO } from '#lib/pagos.ts';
	import { refrescoAutomatico } from '#lib/cliente/refresco.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	refrescoAutomatico();

	const nuevo = resolve('/gestion/pagos/nuevo');
	const plural = (n: number) => (n === 1 ? '1 ticket' : `${n} tickets`);
</script>

<svelte:head><title>Pagos · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Pagos</h1>

	<section aria-labelledby="titulo-por-pagar" class="flex flex-col gap-3">
		<h2 id="titulo-por-pagar" class="font-display text-xl font-bold">Por pagar</h2>
		{#if data.pendientes.length}
			<ul class="flex flex-col gap-2" aria-label="Socios con tickets pendientes de pago">
				{#each data.pendientes as p (p.socioId)}
					<li>
						<a
							href="{nuevo}?socio={p.socioId}"
							class="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-sunken"
						>
							<Euro size={20} aria-hidden="true" class="shrink-0 text-pp" />
							<span class="flex min-w-0 flex-1 flex-col">
								<span class="font-bold">{p.socio}</span>
								<span class="text-sm text-muted"
									>{p.tickets === 1
										? '1 ticket pendiente de pago'
										: `${p.tickets} tickets pendientes de pago`}</span
								>
							</span>
							<span class="font-mono font-bold">{formatoImporte(p.totalCentimos)}</span>
							<span class="sr-only">Registrar pago</span>
							<ChevronRight size={20} aria-hidden="true" class="shrink-0" />
						</a>
					</li>
				{/each}
			</ul>
			<p class="text-sm text-muted">
				No aparecen tus propios tickets: los tiene que pagar otro tesorero.
			</p>
		{:else}
			<p class="rounded-lg bg-sunken px-4 py-3">No hay nada pendiente de pago.</p>
		{/if}
	</section>

	<section aria-labelledby="titulo-ultimos" class="flex flex-col gap-3">
		<h2 id="titulo-ultimos" class="font-display text-xl font-bold">Últimos pagos</h2>
		{#if data.pagos.length}
			<ul class="flex flex-col gap-2" aria-label="Últimos pagos">
				{#each data.pagos as p (p.id)}
					<li>
						<a
							href={resolve('/gestion/pagos/[id]', { id: p.id })}
							class="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-sunken"
						>
							<span class="flex min-w-0 flex-1 flex-col">
								<span class="font-bold">{p.socio}</span>
								<span class="text-sm text-muted">
									{formatoDia(p.fechaPago)} · {TEXTO_METODO[p.metodo]} · {plural(p.tickets)}
								</span>
							</span>
							{#if p.anulado}
								<span class="rounded-full bg-an-bg px-2 py-0.5 text-sm font-bold text-an"
									>Deshecho</span
								>
							{/if}
							<span class="font-mono font-bold" class:line-through={p.anulado}
								>{formatoImporte(p.importeTotalCentimos)}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-lg bg-sunken px-4 py-3">Todavía no se ha registrado ningún pago.</p>
		{/if}
	</section>
</main>
