<script lang="ts">
	import { ArrowLeft, FileText } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import {
		formatoDia,
		formatoFechaHora,
		formatoImporte,
		formatoNumeroTicket
	} from '#lib/formato.ts';
	import { TEXTO_METODO } from '#lib/pagos.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.pago);
	// Tras registrarlo se llega aquí con ?registrado.
	const registrado = $derived(page.url.searchParams.has('registrado'));
	const plural = (n: number) => (n === 1 ? '1 ticket' : `${n} tickets`);
</script>

<svelte:head><title>Pago a {p.socio} · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<a
		href={resolve('/gestion/pagos')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold"
	>
		<ArrowLeft size={20} aria-hidden="true" />Pagos
	</a>

	<h1 class="font-display text-3xl font-bold">Pago a {p.socio}</h1>

	{#if registrado}
		<Aviso tipo="exito">Pago registrado.</Aviso>
	{/if}
	{#if p.anuladoEn}
		<section
			aria-labelledby="titulo-deshecho"
			class="flex flex-col gap-1 rounded-lg border-l-4 border-an bg-an-bg px-4 py-3"
		>
			<h2 id="titulo-deshecho" class="font-bold text-an">Pago deshecho</h2>
			{#if p.motivoAnulacion}<p class="break-words">«{p.motivoAnulacion}»</p>{/if}
			<p class="text-sm text-muted">{formatoFechaHora(p.anuladoEn)}</p>
		</section>
	{/if}

	<dl
		class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3"
	>
		<dt class="text-muted">Importe</dt>
		<dd class="font-mono font-bold">{formatoImporte(p.importeTotalCentimos)}</dd>
		<dt class="text-muted">Fecha del pago</dt>
		<dd class="font-mono">{formatoDia(p.fechaPago)}</dd>
		<dt class="text-muted">Método</dt>
		<dd>{TEXTO_METODO[p.metodo]}</dd>
		<dt class="text-muted">Registrado por</dt>
		<dd>{p.registradoPor} · {formatoFechaHora(p.creadoEn)}</dd>
		<dt class="text-muted">Justificante</dt>
		<dd>
			{#if p.conJustificante}
				<a
					href={resolve('/justificantes/[pagoId]', { pagoId: p.id })}
					target="_blank"
					class="inline-flex items-center gap-1 font-bold underline"
					><FileText size={16} aria-hidden="true" />Ver justificante</a
				>
			{:else}
				<span class="text-muted">Sin justificante</span>
			{/if}
		</dd>
	</dl>

	<section aria-labelledby="titulo-tickets" class="flex flex-col gap-2">
		<h2 id="titulo-tickets" class="font-display text-xl font-bold">
			{plural(p.tickets.length)}
		</h2>
		<ul class="flex flex-col gap-2">
			{#each p.tickets as t (t.numero)}
				<li>
					<a
						href={resolve('/gestion/tickets/[numero]', { numero: String(t.numero) })}
						class="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-sunken"
					>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="font-mono font-bold">{formatoNumeroTicket(t.numero)}</span>
							<span class="text-sm text-muted"
								>{t.concepto} · compra {formatoDia(t.fechaCompra)}</span
							>
						</span>
						<EstadoInsignia estado={t.estado} corto />
						<span class="font-mono">{formatoImporte(t.importeCentimos)}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</main>
