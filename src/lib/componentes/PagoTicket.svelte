<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { MetodoPago } from '#lib/pagos.ts';
	import { TEXTO_METODO } from '#lib/pagos.ts';
	import { formatoDia, formatoImporte } from '#lib/formato.ts';

	// El pago de un ticket pagado (HU-S03): cuándo, cómo y si incluye otros tickets.
	let {
		pago,
		detalle = false
	}: {
		pago: {
			id: string;
			fechaPago: string;
			metodo: MetodoPago;
			importeTotalCentimos: number;
			conJustificante: boolean;
			tickets: number;
		};
		/** Para el tesorero: enlaza al detalle del pago. */
		detalle?: boolean;
	} = $props();
</script>

<section
	aria-labelledby="titulo-pago"
	class="flex flex-col gap-1 rounded-lg border-l-4 border-pg bg-pg-bg px-4 py-3"
>
	<h2 id="titulo-pago" class="font-bold text-pg">
		Pagado el {formatoDia(pago.fechaPago)} por {TEXTO_METODO[pago.metodo]}
	</h2>
	{#if pago.tickets > 1}
		<p>
			El pago incluye {pago.tickets} tickets:
			<span class="font-mono font-bold">{formatoImporte(pago.importeTotalCentimos)}</span> en total.
		</p>
	{/if}
	<div class="flex flex-wrap gap-x-4">
		{#if pago.conJustificante}
			<a
				href={resolve('/justificantes/[pagoId]', { pagoId: pago.id })}
				target="_blank"
				class="inline-flex min-h-11 items-center gap-1 font-bold underline"
				><FileText size={16} aria-hidden="true" />Ver justificante</a
			>
		{/if}
		{#if detalle}
			<a
				href={resolve('/gestion/pagos/[id]', { id: pago.id })}
				class="inline-flex min-h-11 items-center font-bold underline">Ver el pago</a
			>
		{/if}
	</div>
</section>
