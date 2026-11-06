<script lang="ts">
	import { ArrowLeft, FileText, X } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import {
		formatoDia,
		formatoFechaHora,
		formatoImporte,
		formatoNumeroTicket
	} from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(data.ticket);

	const TEXTO_ACCION: Record<(typeof t.historial)[number]['accion'], string> = {
		crear: 'Enviado',
		editar: 'Editado',
		anular: 'Anulado',
		reenviar: 'Corregido y reenviado',
		autorizar: 'Autorizado',
		rechazar: 'Rechazado',
		pagar: 'Pagado',
		deshacer_autorizacion: 'Autorización deshecha',
		deshacer_rechazo: 'Rechazo deshecho',
		deshacer_pago: 'Pago deshecho'
	};
	const quien = (h: (typeof t.historial)[number]) => (h.usuarioId === data.yo ? 'ti' : h.nombre);
	// El rechazo vigente: la última entrada «rechazar» del historial (que va de lo último a lo primero).
	const rechazo = $derived(t.historial.find((h) => h.accion === 'rechazar'));

	const fichero = (id: string) => resolve('/ficheros/[id]', { id });
	let ampliada = $state<{ id: string; nombre: string } | null>(null);
	let dialogo = $state<HTMLDialogElement>();
	$effect(() => {
		if (ampliada) dialogo?.showModal();
	});
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

	<section aria-labelledby="titulo-ficheros" class="flex flex-col gap-2">
		<h2 id="titulo-ficheros" class="sr-only">Fotos y documentos</h2>
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each t.ficheros as f (f.id)}
				<li>
					{#if f.tipoMime.startsWith('image/')}
						<button
							type="button"
							class="block w-full overflow-hidden rounded-lg border border-line bg-sunken"
							aria-label="Ampliar {f.nombreOriginal}"
							onclick={() => (ampliada = { id: f.id, nombre: f.nombreOriginal })}
						>
							<img
								src={fichero(f.id)}
								alt=""
								class="aspect-[3/4] w-full object-cover"
								loading="lazy"
							/>
						</button>
					{:else}
						<a
							href={fichero(f.id)}
							target="_blank"
							rel="noopener"
							class="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface p-3 text-center hover:bg-sunken"
						>
							<FileText size={36} aria-hidden="true" class="text-muted" />
							<span class="font-bold">Ver PDF</span>
							<span class="text-sm break-all text-muted">{f.nombreOriginal}</span>
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<dl
		class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3"
	>
		<dt class="text-muted">Importe</dt>
		<dd class="font-mono font-bold tabular-nums">{formatoImporte(t.importeCentimos)}</dd>
		<dt class="text-muted">Fecha de compra</dt>
		<dd>{formatoDia(t.fechaCompra)}</dd>
		<dt class="text-muted">Concepto</dt>
		<dd class="break-words">{t.concepto}</dd>
		{#if t.observaciones}
			<dt class="text-muted">Observaciones</dt>
			<dd class="break-words">{t.observaciones}</dd>
		{/if}
	</dl>

	<section aria-labelledby="titulo-historial" class="flex flex-col gap-2">
		<h2 id="titulo-historial" class="font-display text-xl font-bold">Historial</h2>
		<ol class="flex flex-col gap-2 border-l-2 border-line pl-4">
			{#each t.historial as h, i (i)}
				<li class="flex flex-col">
					<span><span class="font-bold">{TEXTO_ACCION[h.accion]}</span> por {quien(h)}</span>
					<span class="text-sm text-muted">{formatoFechaHora(h.creadoEn)}</span>
				</li>
			{/each}
		</ol>
	</section>
</main>

<!-- Foto ampliada: Esc o ✕ la cierran. -->
<dialog
	bind:this={dialogo}
	onclose={() => (ampliada = null)}
	aria-label={ampliada ? `Foto ${ampliada.nombre}` : undefined}
	class="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
>
	{#if ampliada}
		<div class="flex h-dvh w-screen flex-col">
			<div class="flex justify-end p-2">
				<button
					type="button"
					class="inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
					aria-label="Cerrar"
					onclick={() => dialogo?.close()}><X size={24} aria-hidden="true" /></button
				>
			</div>
			<div class="min-h-0 flex-1 overflow-auto px-2 pb-2">
				<img
					src={fichero(ampliada.id)}
					alt={ampliada.nombre}
					class="mx-auto max-h-full max-w-full object-contain"
				/>
			</div>
		</div>
	{/if}
</dialog>
