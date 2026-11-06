<script lang="ts">
	import {
		ChevronLeft,
		ChevronRight,
		FileText,
		RotateCw,
		X,
		ZoomIn,
		ZoomOut
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';

	type Fichero = { id: string; nombreOriginal: string; tipoMime: string };
	let { ficheros }: { ficheros: Fichero[] } = $props();

	const fichero = (id: string) => resolve('/ficheros/[id]', { id });
	// El visor solo pasa por las fotos; los PDF se abren en otra pestaña.
	const fotos = $derived(ficheros.filter((f) => f.tipoMime.startsWith('image/')));

	let actual = $state<number | null>(null);
	let giro = $state(0);
	let zoom = $state(false);
	let dialogo = $state<HTMLDialogElement>();
	const foto = $derived(actual === null ? null : fotos[actual]);
	const deLado = $derived(giro % 180 !== 0);

	function abrir(id: string) {
		actual = fotos.findIndex((f) => f.id === id);
		dialogo?.showModal();
	}
	function ir(paso: number) {
		if (actual === null) return;
		actual = (actual + paso + fotos.length) % fotos.length;
	}
	// Cada foto empieza derecha y ajustada a la pantalla.
	$effect(() => {
		void actual;
		giro = 0;
		zoom = false;
	});

	function teclas(evento: KeyboardEvent) {
		if (fotos.length < 2) return;
		if (evento.key === 'ArrowRight') ir(1);
		if (evento.key === 'ArrowLeft') ir(-1);
	}

	const claseBoton =
		'inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80';
</script>

<section aria-labelledby="titulo-ficheros" class="@container flex flex-col gap-2">
	<h2 id="titulo-ficheros" class="sr-only">Fotos y documentos</h2>
	<!-- Según el ancho de su columna: en la revisión ocupa media pantalla y las fotos salen más grandes. -->
	<ul class="grid grid-cols-2 gap-2 @2xl:grid-cols-3">
		{#each ficheros as f (f.id)}
			<li>
				{#if f.tipoMime.startsWith('image/')}
					<button
						type="button"
						class="block w-full overflow-hidden rounded-lg border border-line bg-sunken"
						aria-label="Ampliar {f.nombreOriginal}"
						onclick={() => abrir(f.id)}
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

<!-- Visor: Esc o ✕ lo cierran; las flechas del teclado pasan de foto. -->
<dialog
	bind:this={dialogo}
	onclose={() => (actual = null)}
	onkeydown={teclas}
	aria-label={foto ? `Foto ${foto.nombreOriginal}` : undefined}
	class="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
>
	{#if foto && actual !== null}
		<div class="flex h-dvh w-screen flex-col">
			<div class="flex items-center gap-2 p-2 text-white">
				{#if fotos.length > 1}
					<button type="button" class={claseBoton} aria-label="Foto anterior" onclick={() => ir(-1)}
						><ChevronLeft size={24} aria-hidden="true" /></button
					>
					<span class="text-sm font-bold">Foto {actual + 1} de {fotos.length}</span>
					<button type="button" class={claseBoton} aria-label="Foto siguiente" onclick={() => ir(1)}
						><ChevronRight size={24} aria-hidden="true" /></button
					>
				{/if}
				<span class="ml-auto flex gap-2">
					<button
						type="button"
						class={claseBoton}
						aria-label={zoom ? 'Ajustar a la pantalla' : 'Ver a tamaño real'}
						aria-pressed={zoom}
						onclick={() => (zoom = !zoom)}
					>
						{#if zoom}<ZoomOut size={22} aria-hidden="true" />{:else}<ZoomIn
								size={22}
								aria-hidden="true"
							/>{/if}
					</button>
					<button
						type="button"
						class={claseBoton}
						aria-label="Girar"
						onclick={() => (giro = (giro + 90) % 360)}
						><RotateCw size={22} aria-hidden="true" /></button
					>
					<button
						type="button"
						class={claseBoton}
						aria-label="Cerrar"
						onclick={() => dialogo?.close()}><X size={24} aria-hidden="true" /></button
					>
				</span>
			</div>
			<div
				class="flex min-h-0 flex-1 overflow-auto px-2 pb-2 {zoom
					? 'items-start justify-start'
					: 'items-center justify-center'}"
			>
				<!-- De lado, el ancho y el alto disponibles se intercambian para que quepa entera. -->
				<img
					src={fichero(foto.id)}
					alt={foto.nombreOriginal}
					style:rotate="{giro}deg"
					style:max-width={zoom ? 'none' : deLado ? 'calc(100dvh - 4.5rem)' : '100%'}
					style:max-height={zoom ? 'none' : deLado ? '100vw' : '100%'}
					class="object-contain {zoom ? 'm-auto' : ''}"
				/>
			</div>
		</div>
	{/if}
</dialog>
