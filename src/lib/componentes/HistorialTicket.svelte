<script lang="ts">
	import { TEXTO_ACCION, type AccionHistorial } from '#lib/estados.ts';
	import { formatoFechaHora } from '#lib/formato.ts';

	type Entrada = {
		accion: AccionHistorial;
		motivo: string | null;
		creadoEn: Date;
		usuarioId: string;
		nombre: string;
	};

	/** El historial va de lo último a lo primero; `yo` se muestra como «ti». */
	let { historial, yo }: { historial: Entrada[]; yo: string } = $props();
</script>

<section aria-labelledby="titulo-historial" class="flex flex-col gap-2">
	<h2 id="titulo-historial" class="font-display text-xl font-bold">Historial</h2>
	<ol class="flex flex-col gap-2 border-l-2 border-line pl-4">
		{#each historial as h, i (i)}
			<li class="flex flex-col">
				<span
					><span class="font-bold">{TEXTO_ACCION[h.accion]}</span> por {h.usuarioId === yo
						? 'ti'
						: h.nombre}</span
				>
				{#if h.motivo}
					<span class="break-words">«{h.motivo}»</span>
				{/if}
				<span class="text-sm text-muted">{formatoFechaHora(h.creadoEn)}</span>
			</li>
		{/each}
	</ol>
</section>
