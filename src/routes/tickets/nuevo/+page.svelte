<script lang="ts">
	import { Camera, FileText, Paperclip } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import { ACEPTA, MAX_FICHEROS, OTRO } from '#lib/esquemas/ticket.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form);

	// Lo elegido en cada botón, para enseñarlo. La compresión y las miniaturas llegan en el PR4b.
	let deCamara = $state<string[]>([]);
	let deArchivo = $state<string[]>([]);
	const nombres = (e: Event) =>
		[...((e.currentTarget as HTMLInputElement).files ?? [])].map((f) => f.name);
	const elegidos = $derived([...deCamara, ...deArchivo]);
	const errorFicheros = $derived($errors.ficheros?._errors?.[0]);

	const botonFichero =
		'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus';
	const chip =
		'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-on-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';
</script>

<svelte:head><title>Nuevo ticket · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Nuevo ticket</h1>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="flex flex-col gap-6"
		novalidate
	>
		<fieldset
			class="flex flex-col gap-2"
			aria-describedby={errorFicheros ? 'ficheros-error' : 'ficheros-ayuda'}
		>
			<legend class="mb-1.5 font-bold">Fotos del ticket</legend>
			<div class="flex flex-wrap gap-2">
				<label class={botonFichero}>
					<Camera size={20} aria-hidden="true" />Hacer foto
					<input
						type="file"
						name="ficheros"
						accept="image/*"
						capture="environment"
						class="sr-only"
						onchange={(e) => (deCamara = nombres(e))}
					/>
				</label>
				<label class={botonFichero}>
					<Paperclip size={20} aria-hidden="true" />Elegir archivo
					<input
						type="file"
						name="ficheros"
						accept={ACEPTA}
						multiple
						class="sr-only"
						onchange={(e) => (deArchivo = nombres(e))}
					/>
				</label>
			</div>
			{#if elegidos.length}
				<ul class="flex flex-col gap-1 text-sm" aria-label="Ficheros elegidos">
					{#each elegidos as nombre, i (i)}
						<li class="flex items-center gap-2">
							<FileText size={16} aria-hidden="true" class="shrink-0 text-muted" />
							<span class="min-w-0 break-all">{nombre}</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if errorFicheros}
				<p id="ficheros-error" class="text-sm font-bold text-rj">{errorFicheros}</p>
			{/if}
			<p id="ficheros-ayuda" class="text-sm text-muted">
				Fotos o PDF, hasta {MAX_FICHEROS}. Si el ticket es largo, haz varias fotos.
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
			errores={$errors.importe}
		/>
		<Campo
			etiqueta="Fecha de compra"
			name="fechaCompra"
			type="date"
			max={data.hoy}
			bind:value={$form.fechaCompra}
			errores={$errors.fechaCompra}
		/>

		<fieldset
			class="flex flex-col gap-2"
			aria-describedby={$errors.concepto ? 'concepto-error' : undefined}
		>
			<legend class="mb-1.5 font-bold">Concepto</legend>
			<div class="flex flex-wrap gap-2">
				{#each data.conceptos as c (c.id)}
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
			{#if $errors.concepto}
				<p id="concepto-error" class="text-sm font-bold text-rj">{$errors.concepto[0]}</p>
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
				errores={$errors.conceptoOtro}
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
				aria-invalid={$errors.observaciones ? 'true' : undefined}
				aria-describedby={$errors.observaciones ? 'observaciones-error' : undefined}
				bind:value={$form.observaciones}
				class="rounded-lg border border-line bg-surface px-3 py-2 text-ink"></textarea>
			{#if $errors.observaciones}
				<p id="observaciones-error" class="text-sm font-bold text-rj">{$errors.observaciones[0]}</p>
			{/if}
		</div>

		<Boton type="submit" anchoCompleto disabled={$submitting}>
			{$submitting ? 'Enviando…' : 'Enviar ticket'}
		</Boton>
	</form>
</main>
