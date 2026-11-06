<script lang="ts">
	import { Ban, Check, Clock, Euro, X } from '@lucide/svelte';
	import { TEXTO_ESTADO, type EstadoTicket } from '#lib/estados.ts';

	/** `corto`: «Pend. autorizar» y «Pend. pago», para donde falta sitio (como en el boceto). */
	let { estado, corto = false }: { estado: EstadoTicket; corto?: boolean } = $props();

	const CORTO: Partial<Record<EstadoTicket, string>> = {
		pendiente_autorizar: 'Pend. autorizar',
		pendiente_pago: 'Pend. pago'
	};

	const estilo = {
		pendiente_autorizar: { clase: 'bg-pa-bg text-pa', icono: Clock },
		pendiente_pago: { clase: 'bg-pp-bg text-pp', icono: Euro },
		pagado: { clase: 'bg-pg-bg text-pg', icono: Check },
		rechazado: { clase: 'bg-rj-bg text-rj', icono: X },
		anulado: { clase: 'bg-an-bg text-an', icono: Ban }
	} as const;

	const { clase, icono: Icono } = $derived(estilo[estado]);
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold whitespace-nowrap {clase}"
>
	<Icono size={14} strokeWidth={2.5} aria-hidden="true" />
	{#if corto && CORTO[estado]}
		<span aria-hidden="true">{CORTO[estado]}</span><span class="sr-only"
			>{TEXTO_ESTADO[estado]}</span
		>
	{:else}
		{TEXTO_ESTADO[estado]}
	{/if}
</span>
