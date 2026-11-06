<script lang="ts" generics="T extends CamposFormulario">
	import { Camera, FileText, Paperclip, Undo2, X } from '@lucide/svelte';
	import type { SuperFormData } from 'sveltekit-superforms/client';
	import { resolve } from '$app/paths';
	import type { Fotos } from '#lib/cliente/fotos.svelte.ts';
	import Campo from '#lib/componentes/Campo.svelte';
	import { ACEPTA, MAX_FICHEROS, OTRO, type CamposFormulario } from '#lib/esquemas/ticket.ts';
	import { formatoTamano } from '#lib/formato.ts';

	type Existente = { id: string; nombreOriginal: string; tipoMime: string; tamanoBytes: number };

	// Los campos de un ticket, para enviarlo (HU-S01) y para editarlo o corregirlo (HU-S04, S06).
	// La página pone el <form>, el superForm y el botón; aquí van las fotos y los datos.
	let {
		form,
		errores,
		errorFicheros,
		fotos,
		conceptos,
		hoy,
		existentes = [],
		quitar = $bindable([])
	}: {
		form: SuperFormData<T>;
		errores: Partial<Record<keyof CamposFormulario, string[]>>;
		errorFicheros?: string;
		fotos: Fotos;
		/** Los activos y, al editar, el que ya tenía aunque esté desactivado. */
		conceptos: { id: number; nombre: string }[];
		hoy: string;
		/** Al editar: los ficheros que ya tiene el ticket. */
		existentes?: Existente[];
		/** Ids de los existentes que se quitan; se envían en `quitar`. `fotos` los descuenta. */
		quitar?: string[];
	} = $props();

	const conservados = $derived(existentes.filter((e) => !quitar.includes(e.id)).length);
	const total = $derived(conservados + fotos.elegidos.length);
	const completo = $derived(fotos.hueco <= 0);

	const botonFichero =
		'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus has-disabled:cursor-not-allowed has-disabled:opacity-50';
	const chip =
		'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-on-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';
	const botonIcono =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-sunken';
</script>

{#snippet miniatura(vista: string | undefined)}
	{#if vista}
		<img src={vista} alt="" class="size-16 shrink-0 rounded object-cover" />
	{:else}
		<span class="flex size-16 shrink-0 items-center justify-center rounded bg-sunken">
			<FileText size={28} aria-hidden="true" class="text-muted" />
		</span>
	{/if}
{/snippet}

<fieldset
	class="flex flex-col gap-2"
	aria-describedby={errorFicheros ? 'ficheros-error' : 'ficheros-ayuda'}
>
	<legend class="mb-1.5 font-bold">
		Fotos del ticket
		{#if total}
			<span class="font-normal text-muted">· {total} de {MAX_FICHEROS}</span>
		{/if}
	</legend>
	{#each quitar as id (id)}
		<input type="hidden" name="quitar" value={id} />
	{/each}
	{#if existentes.length || fotos.elegidos.length}
		<ul class="flex flex-col gap-2" aria-label="Ficheros del ticket">
			{#each existentes as e (e.id)}
				{@const quitado = quitar.includes(e.id)}
				<li
					class="flex items-center gap-3 rounded-lg border border-line bg-surface p-2"
					class:opacity-60={quitado}
				>
					{@render miniatura(
						e.tipoMime.startsWith('image/') ? resolve('/ficheros/[id]', { id: e.id }) : undefined
					)}
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="text-sm font-bold break-all" class:line-through={quitado}
							>{e.nombreOriginal}</span
						>
						<span class="text-sm text-muted">
							{quitado
								? 'Se quitará al guardar. Quedará en el historial.'
								: formatoTamano(e.tamanoBytes)}
						</span>
					</span>
					{#if quitado}
						<button
							type="button"
							class={botonIcono}
							aria-label="Recuperar {e.nombreOriginal}"
							disabled={completo}
							onclick={() => (quitar = quitar.filter((x) => x !== e.id))}
							><Undo2 size={20} aria-hidden="true" /></button
						>
					{:else}
						<button
							type="button"
							class={botonIcono}
							aria-label="Quitar {e.nombreOriginal}"
							onclick={() => (quitar = [...quitar, e.id])}
							><X size={20} aria-hidden="true" /></button
						>
					{/if}
				</li>
			{/each}
			{#each fotos.elegidos as e (e.id)}
				<li class="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
					{@render miniatura(e.vista)}
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="text-sm font-bold break-all">{e.fichero.name}</span>
						<span class="text-sm text-muted">
							{e.antes > e.fichero.size
								? `Reducida de ${formatoTamano(e.antes)} a ${formatoTamano(e.fichero.size)}`
								: formatoTamano(e.fichero.size)}
						</span>
					</span>
					<button
						type="button"
						class={botonIcono}
						aria-label="Quitar {e.fichero.name}"
						onclick={() => fotos.quitar(e.id)}><X size={20} aria-hidden="true" /></button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if fotos.preparando}
		<p class="text-sm text-muted" role="status">
			Preparando {fotos.preparando === 1 ? 'la foto' : `${fotos.preparando} fotos`}…
		</p>
	{/if}
	<div class="flex flex-wrap gap-2">
		<label class={botonFichero}>
			<Camera size={20} aria-hidden="true" />Hacer foto
			<input
				type="file"
				name="ficheros"
				accept="image/*"
				capture="environment"
				disabled={completo}
				class="sr-only"
				onchange={(e) => fotos.anadir(e.currentTarget)}
			/>
		</label>
		<label class={botonFichero}>
			<Paperclip size={20} aria-hidden="true" />Elegir archivo
			<input
				type="file"
				name="ficheros"
				accept={ACEPTA}
				multiple
				disabled={completo}
				class="sr-only"
				onchange={(e) => fotos.anadir(e.currentTarget)}
			/>
		</label>
	</div>
	{#if errorFicheros}
		<p id="ficheros-error" class="text-sm font-bold text-rj">{errorFicheros}</p>
	{/if}
	<p id="ficheros-ayuda" class="text-sm text-muted">
		Fotos o PDF, hasta {MAX_FICHEROS}. Si el ticket es largo, haz varias fotos. Las fotos se reducen
		en el móvil antes de enviarse.
	</p>
</fieldset>

<Campo
	etiqueta="Importe (€)"
	name="importe"
	inputmode="decimal"
	autocomplete="off"
	placeholder="23,45"
	class="font-mono"
	bind:value={$form.importe}
	errores={errores.importe}
/>
<Campo
	etiqueta="Fecha de compra"
	name="fechaCompra"
	type="date"
	max={hoy}
	bind:value={$form.fechaCompra}
	errores={errores.fechaCompra}
/>

<fieldset
	class="flex flex-col gap-2"
	aria-describedby={errores.concepto ? 'concepto-error' : undefined}
>
	<legend class="mb-1.5 font-bold">Concepto</legend>
	<div class="flex flex-wrap gap-2">
		{#each conceptos as c (c.id)}
			<label class={chip}>
				<input
					type="radio"
					name="concepto"
					value={String(c.id)}
					bind:group={$form.concepto}
					class="sr-only"
				/>
				{c.nombre}
			</label>
		{/each}
		<label class={chip}>
			<input
				type="radio"
				name="concepto"
				value={OTRO}
				bind:group={$form.concepto}
				class="sr-only"
			/>
			Otro…
		</label>
	</div>
	{#if errores.concepto}
		<p id="concepto-error" class="text-sm font-bold text-rj">{errores.concepto[0]}</p>
	{/if}
</fieldset>

{#if $form.concepto === OTRO}
	<Campo
		etiqueta="¿Qué concepto?"
		name="conceptoOtro"
		autocomplete="off"
		maxlength={100}
		ayuda="Descríbelo en pocas palabras (máximo 100 caracteres)."
		bind:value={$form.conceptoOtro}
		errores={errores.conceptoOtro}
	/>
{/if}

<div class="flex flex-col gap-1.5">
	<label for="observaciones" class="font-bold">Observaciones (opcional)</label>
	<textarea
		id="observaciones"
		name="observaciones"
		rows="3"
		maxlength="500"
		placeholder="Ej.: material para el escenario"
		aria-invalid={errores.observaciones ? 'true' : undefined}
		aria-describedby={errores.observaciones ? 'observaciones-error' : undefined}
		bind:value={$form.observaciones}
		class="rounded-lg border border-line bg-surface px-3 py-2 text-ink"></textarea>
	{#if errores.observaciones}
		<p id="observaciones-error" class="text-sm font-bold text-rj">{errores.observaciones[0]}</p>
	{/if}
</div>
