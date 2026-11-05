<script lang="ts">
	import { Ban, Check, Clock, Euro, X } from '@lucide/svelte';
	import { TEXTO_ESTADO, type EstadoTicket } from '#lib/estados.ts';

	let { estado }: { estado: EstadoTicket } = $props();

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
	{TEXTO_ESTADO[estado]}
</span>
