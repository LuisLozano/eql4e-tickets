<script lang="ts">
	import { resolve } from '$app/paths';
	import { TEXTO_ACCION, type AccionHistorial, type CambiosTicket } from '#lib/estados.ts';
	import { formatoDia, formatoFechaHora, formatoImporte } from '#lib/formato.ts';
	import { TEXTO_METODO, type MetodoPago } from '#lib/pagos.ts';

	type Entrada = {
		accion: AccionHistorial;
		motivo: string | null;
		cambios: CambiosTicket | null;
		metodoPago: MetodoPago | null;
		creadoEn: Date;
		usuarioId: string;
		nombre: string;
	};

	/**
	 * El historial va de lo último a lo primero; `yo` se muestra como «ti». `ficheros` son todos los
	 * del ticket, también los sustituidos, que solo se ven desde aquí (HU-S04).
	 */
	let {
		historial,
		yo,
		ficheros
	}: {
		historial: Entrada[];
		yo: string;
		ficheros: { id: string; nombreOriginal: string }[];
	} = $props();

	const nombreFichero = (id: string) =>
		ficheros.find((f) => f.id === id)?.nombreOriginal ?? 'fichero';
	const texto = (t: string | null) => (t ? `«${t}»` : '(nada)');
</script>

<section aria-labelledby="titulo-historial" class="flex flex-col gap-2">
	<h2 id="titulo-historial" class="font-display text-xl font-bold">Historial</h2>
	<ol class="flex flex-col gap-2 border-l-2 border-line pl-4">
		{#each historial as h, i (i)}
			<li class="flex flex-col">
				<span
					><span class="font-bold">{TEXTO_ACCION[h.accion]}</span> por {h.usuarioId === yo
						? 'ti'
						: h.nombre}{h.metodoPago ? ` · ${TEXTO_METODO[h.metodoPago]}` : ''}</span
				>
				{#if h.motivo}
					<span class="break-words">«{h.motivo}»</span>
				{/if}
				{#if h.cambios}
					{@const c = h.cambios}
					<ul class="flex flex-col text-sm">
						{#if c.importeCentimos}
							<li>
								Importe: <span class="font-mono">{formatoImporte(c.importeCentimos[0])}</span> →
								<span class="font-mono">{formatoImporte(c.importeCentimos[1])}</span>
							</li>
						{/if}
						{#if c.fechaCompra}
							<li>
								Fecha de compra: {formatoDia(c.fechaCompra[0])} → {formatoDia(c.fechaCompra[1])}
							</li>
						{/if}
						{#if c.concepto}
							<li>Concepto: {c.concepto[0]} → {c.concepto[1]}</li>
						{/if}
						{#if c.observaciones}
							<li class="break-words">
								Observaciones: {texto(c.observaciones[0])} → {texto(c.observaciones[1])}
							</li>
						{/if}
						{#if c.ficheros?.[0].length}
							<li class="break-all">
								Quitó:
								{#each c.ficheros[0] as id, j (id)}{j ? ', ' : ''}<a
										href={resolve('/ficheros/[id]', { id })}
										target="_blank"
										class="font-bold underline">{nombreFichero(id)}</a
									>{/each}
							</li>
						{/if}
						{#if c.ficheros?.[1].length}
							<li>
								Añadió {c.ficheros[1].length === 1
									? '1 fichero'
									: `${c.ficheros[1].length} ficheros`}
							</li>
						{/if}
					</ul>
				{/if}
				<span class="text-sm text-muted">{formatoFechaHora(h.creadoEn)}</span>
			</li>
		{/each}
	</ol>
</section>
