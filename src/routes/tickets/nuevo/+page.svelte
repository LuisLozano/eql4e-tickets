<script lang="ts">
	import { Camera, FileText, Paperclip, X } from '@lucide/svelte';
	import { onDestroy, onMount } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { page } from '$app/state';
	import { borrarBorrador, guardarBorrador, leerBorrador } from '#lib/cliente/borrador.ts';
	import { comprimir } from '#lib/cliente/compresion.ts';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import { ACEPTA, MAX_BYTES, MAX_FICHEROS, OTRO } from '#lib/esquemas/ticket.ts';
	import { formatoTamano } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Las fotos se guardan aquí, ya comprimidas, y se añaden al envío. Los <input type="file">
	// solo sirven para elegirlas (sin JavaScript, envían lo que tengan, como antes).
	type Elegido = { id: number; fichero: File; antes: number; vista?: string };
	let elegidos = $state<Elegido[]>([]);
	let preparando = $state(0);
	let avisoFicheros = $state<string | null>(null);
	let recuperado = $state(false);
	let sinEnviar = $state(false);
	let siguiente = 0;

	// Un borrador por usuario: el móvil puede ser compartido.
	const clave = `ticket-nuevo:${page.data.usuario?.id}`;

	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting, reset } = superForm(data.form, {
		async onSubmit({ formData, cancel }) {
			if (preparando) {
				avisoFicheros = 'Espera a que terminen de prepararse las fotos.';
				return cancel();
			}
			sinEnviar = false;
			formData.delete('ficheros');
			for (const e of elegidos) formData.append('ficheros', e.fichero, e.fichero.name);
			await guardarBorrador(clave, {
				campos: Object.fromEntries(
					(['importe', 'fechaCompra', 'concepto', 'conceptoOtro', 'observaciones'] as const).map(
						(c) => [c, $form[c]]
					)
				),
				ficheros: elegidos.map((e) => ({
					nombre: e.fichero.name,
					tipo: e.fichero.type,
					antes: e.antes,
					datos: e.fichero
				}))
			});
		},
		async onResult({ result }) {
			if (result.type === 'redirect') await borrarBorrador(clave);
		},
		// Sin conexión (o un error del servidor): el formulario sigue aquí y el borrador, guardado.
		onError() {
			sinEnviar = true;
		}
	});

	const errorFicheros = $derived(avisoFicheros ?? $errors.ficheros?._errors?.[0]);
	const completo = $derived(elegidos.length + preparando >= MAX_FICHEROS);

	function anadirElegido(fichero: File, antes: number) {
		const vista = fichero.type.startsWith('image/') ? URL.createObjectURL(fichero) : undefined;
		elegidos.push({ id: ++siguiente, fichero, antes, vista });
	}

	// Una cola: aunque se elija con los dos botones a la vez, se añaden en el orden en que se eligieron.
	let cola = Promise.resolve();

	function anadir(e: Event & { currentTarget: HTMLInputElement }) {
		const nuevos = [...(e.currentTarget.files ?? [])];
		e.currentTarget.value = '';
		avisoFicheros = null;
		for (const fichero of nuevos) {
			if (elegidos.length + preparando >= MAX_FICHEROS) {
				avisoFicheros = `Puedes añadir ${MAX_FICHEROS} ficheros como máximo.`;
				break;
			}
			preparando++;
			cola = cola.then(() => preparar(fichero)).finally(() => preparando--);
		}
	}

	async function preparar(fichero: File) {
		const r = await comprimir(fichero);
		if (!r.ok) {
			avisoFicheros = `«${fichero.name}»: esta foto HEIC no se puede usar. En el iPhone, adjúntala desde «Fotos» o cambia el formato de la cámara a «Más compatible».`;
		} else if (r.fichero.size > MAX_BYTES) {
			avisoFicheros = `«${fichero.name}»: ocupa más de 10 MB.`;
		} else {
			anadirElegido(r.fichero, r.antes);
		}
	}

	function quitar(id: number) {
		const e = elegidos.find((x) => x.id === id);
		if (e?.vista) URL.revokeObjectURL(e.vista);
		elegidos = elegidos.filter((x) => x.id !== id);
		avisoFicheros = null;
	}

	function vaciar() {
		for (const e of elegidos) if (e.vista) URL.revokeObjectURL(e.vista);
		elegidos = [];
	}

	async function descartar() {
		await borrarBorrador(clave);
		vaciar();
		reset();
		recuperado = false;
	}

	onMount(async () => {
		const b = await leerBorrador(clave);
		if (!b) return;
		form.update((f) => ({ ...f, ...b.campos }), { taint: false });
		for (const f of b.ficheros)
			anadirElegido(new File([f.datos], f.nombre, { type: f.tipo }), f.antes);
		recuperado = true;
	});
	onDestroy(vaciar);

	const botonFichero =
		'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus has-disabled:cursor-not-allowed has-disabled:opacity-50';
	const chip =
		'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-on-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';
</script>

<svelte:head><title>Nuevo ticket · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Nuevo ticket</h1>

	{#if recuperado && !sinEnviar}
		<Aviso tipo="atencion">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span>Hemos recuperado el ticket que no llegaste a enviar.</span>
				<button type="button" class="underline" onclick={descartar}>Descartar</button>
			</div>
		</Aviso>
	{/if}

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
			<legend class="mb-1.5 font-bold">
				Fotos del ticket
				{#if elegidos.length}
					<span class="font-normal text-muted">· {elegidos.length} de {MAX_FICHEROS}</span>
				{/if}
			</legend>
			{#if elegidos.length}
				<ul class="flex flex-col gap-2" aria-label="Ficheros elegidos">
					{#each elegidos as e (e.id)}
						<li class="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
							{#if e.vista}
								<img src={e.vista} alt="" class="size-16 shrink-0 rounded object-cover" />
							{:else}
								<span class="flex size-16 shrink-0 items-center justify-center rounded bg-sunken">
									<FileText size={28} aria-hidden="true" class="text-muted" />
								</span>
							{/if}
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
								class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-sunken"
								aria-label="Quitar {e.fichero.name}"
								onclick={() => quitar(e.id)}><X size={20} aria-hidden="true" /></button
							>
						</li>
					{/each}
				</ul>
			{/if}
			{#if preparando}
				<p class="text-sm text-muted" role="status">
					Preparando {preparando === 1 ? 'la foto' : `${preparando} fotos`}…
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
						onchange={anadir}
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
						onchange={anadir}
					/>
				</label>
			</div>
			{#if errorFicheros}
				<p id="ficheros-error" class="text-sm font-bold text-rj">{errorFicheros}</p>
			{/if}
			<p id="ficheros-ayuda" class="text-sm text-muted">
				Fotos o PDF, hasta {MAX_FICHEROS}. Si el ticket es largo, haz varias fotos. Las fotos se
				reducen en el móvil antes de enviarse.
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

		<!-- Junto al botón: en el móvil es donde se está mirando al pulsar «Enviar». -->
		{#if sinEnviar}
			<Aviso>
				No se ha podido enviar. Comprueba la conexión y vuelve a intentarlo: el ticket se ha
				guardado en este dispositivo.
			</Aviso>
		{/if}
		<Boton type="submit" anchoCompleto disabled={$submitting}>
			{$submitting ? 'Enviando…' : 'Enviar ticket'}
		</Boton>
	</form>
</main>
