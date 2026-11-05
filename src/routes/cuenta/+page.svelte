<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		resetForm: true
	});
</script>

<svelte:head><title>Mi cuenta · Tickets</title></svelte:head>

<main class="mx-auto flex max-w-sm flex-col gap-6 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Mi cuenta</h1>

	<section class="flex flex-col gap-4" aria-labelledby="titulo-contrasena">
		<h2 id="titulo-contrasena" class="font-display text-xl font-bold">Cambiar la contraseña</h2>
		{#if $message}<Aviso tipo="exito">{$message}</Aviso>{/if}
		<form
			method="POST"
			action="?/cambiarContrasena"
			use:enhance
			class="flex flex-col gap-4"
			novalidate
		>
			<Campo
				etiqueta="Contraseña actual"
				name="actual"
				type="password"
				autocomplete="current-password"
				bind:value={$form.actual}
				errores={$errors.actual}
			/>
			<Campo
				etiqueta="Contraseña nueva"
				name="nueva"
				type="password"
				autocomplete="new-password"
				ayuda="Mínimo 8 caracteres. Al cambiarla se cierran tus otras sesiones."
				bind:value={$form.nueva}
				errores={$errors.nueva}
			/>
			<Campo
				etiqueta="Repite la contraseña nueva"
				name="repetir"
				type="password"
				autocomplete="new-password"
				bind:value={$form.repetir}
				errores={$errors.repetir}
			/>
			<Boton type="submit" anchoCompleto disabled={$submitting}>Cambiar la contraseña</Boton>
		</form>
	</section>
</main>
