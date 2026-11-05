<script lang="ts">
	import { ArrowDown, ArrowUp, Pencil, Plus } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const crear = superForm(data.crear);
	// svelte-ignore state_referenced_locally
	const renombrar = superForm(data.renombrar);
	const { form: formCrear, errors: erroresCrear, enhance: enhanceCrear } = crear;
	const { form: formRenombrar, errors: erroresRenombrar, enhance: enhanceRenombrar } = renombrar;

	const lista = resolve('/gestion/conceptos');
	const icono = 'inline-flex size-11 items-center justify-center rounded-lg hover:bg-sunken';
</script>

<svelte:head><title>Conceptos · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">Conceptos</h1>
		<p class="text-muted">
			El orden de esta lista es el que ven los socios al enviar un ticket. «Otro…» siempre aparece
			al final. Un concepto desactivado deja de ofrecerse, pero sus tickets lo conservan.
		</p>
	</div>

	<ol class="divide-y divide-line rounded-lg border border-line bg-surface">
		{#each data.conceptos as c, i (c.id)}
			<li
				class="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2 {c.activo ? '' : 'text-muted'}"
			>
				<form method="POST" use:enhance class="flex">
					<input type="hidden" name="id" value={c.id} />
					<button
						formaction="?/subir"
						disabled={i === 0}
						aria-label="Subir {c.nombre}"
						class="{icono} disabled:opacity-30"><ArrowUp size={20} aria-hidden="true" /></button
					>
					<button
						formaction="?/bajar"
						disabled={i === data.conceptos.length - 1}
						aria-label="Bajar {c.nombre}"
						class="{icono} disabled:opacity-30"><ArrowDown size={20} aria-hidden="true" /></button
					>
				</form>

				{#if data.editando === c.id}
					<form
						method="POST"
						action="?/renombrar"
						use:enhanceRenombrar
						class="flex min-w-0 flex-1 basis-64 flex-wrap items-end gap-2"
						novalidate
					>
						<input type="hidden" name="id" value={c.id} />
						<div class="min-w-0 flex-1 basis-48">
							<Campo
								etiqueta="Nuevo nombre"
								name="nombre"
								autocomplete="off"
								bind:value={$formRenombrar.nombre}
								errores={$erroresRenombrar.nombre}
							/>
						</div>
						<Boton type="submit">Guardar</Boton>
						<a href={lista} class="inline-flex min-h-11 items-center px-3 font-bold underline">
							Cancelar
						</a>
					</form>
				{:else}
					<div class="flex min-w-0 flex-1 basis-32 flex-col">
						<span class="font-bold break-words">
							{c.nombre}
							{#if !c.activo}
								<span class="ml-1 rounded-full bg-an-bg px-2 py-0.5 text-xs font-bold text-an"
									>Desactivado</span
								>
							{/if}
						</span>
						<span class="text-sm text-muted tabular-nums">
							{c.tickets}
							{c.tickets === 1 ? 'ticket' : 'tickets'}
						</span>
					</div>
					<form method="POST" action={c.activo ? '?/desactivar' : '?/activar'} use:enhance>
						<input type="hidden" name="id" value={c.id} />
						<button
							type="submit"
							role="switch"
							aria-checked={c.activo}
							aria-label="Activo: {c.nombre}"
							class="group inline-flex min-h-11 items-center px-1"
						>
							<span
								class="flex h-6 w-11 items-center rounded-full p-0.5 transition {c.activo
									? 'bg-pg'
									: 'bg-line'}"
							>
								<span
									class="size-5 rounded-full bg-surface shadow transition {c.activo
										? 'translate-x-5'
										: ''}"
								></span>
							</span>
						</button>
					</form>
					<a
						href="{lista}?editar={c.id}"
						class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg font-bold hover:bg-sunken sm:px-3"
						><Pencil size={20} aria-hidden="true" class="sm:hidden" /><span class="max-sm:sr-only"
							>Renombrar</span
						><span class="sr-only"> {c.nombre}</span></a
					>
				{/if}
			</li>
		{/each}
	</ol>

	<form
		method="POST"
		action="?/crear"
		use:enhanceCrear
		class="flex flex-wrap items-end gap-2"
		novalidate
	>
		<div class="min-w-0 flex-1 basis-56">
			<Campo
				etiqueta="Nombre del nuevo concepto"
				name="nombre"
				autocomplete="off"
				bind:value={$formCrear.nombre}
				errores={$erroresCrear.nombre}
			/>
		</div>
		<Boton type="submit"><Plus size={20} aria-hidden="true" />Añadir</Boton>
	</form>
</main>
