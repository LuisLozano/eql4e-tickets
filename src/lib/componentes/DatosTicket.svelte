<script lang="ts">
	import { formatoDia, formatoImporte } from '#lib/formato.ts';

	type Datos = {
		importeCentimos: number;
		fechaCompra: string;
		concepto: string;
		observaciones: string | null;
	};
	/** `socio` solo se muestra al tesorero: el socio ya sabe que el ticket es suyo. */
	let { ticket, socio }: { ticket: Datos; socio?: string } = $props();
</script>

<dl
	class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3"
>
	{#if socio}
		<dt class="text-muted">Socio</dt>
		<dd class="break-words">{socio}</dd>
	{/if}
	<dt class="text-muted">Importe</dt>
	<dd class="font-mono font-bold tabular-nums">{formatoImporte(ticket.importeCentimos)}</dd>
	<dt class="text-muted">Fecha de compra</dt>
	<dd>{formatoDia(ticket.fechaCompra)}</dd>
	<dt class="text-muted">Concepto</dt>
	<dd class="break-words">{ticket.concepto}</dd>
	{#if ticket.observaciones}
		<dt class="text-muted">Observaciones</dt>
		<dd class="break-words">{ticket.observaciones}</dd>
	{/if}
</dl>
