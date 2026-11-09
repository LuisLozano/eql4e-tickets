<script lang="ts">
	import { resolve } from '$app/paths';
	import { superForm } from 'sveltekit-superforms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import CampoTelefono from '#lib/componentes/CampoTelefono.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form);
</script>

<svelte:head><title>Contraseña nueva · Tickets</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">Elige una contraseña nueva</h1>
		<p class="text-muted">
			La anterior dejará de valer y se cerrará la sesión en tus otros dispositivos.
		</p>
	</div>

	{#if $message}
		<Aviso>
			{$message}
			<a href={resolve('/restablecer')} class="underline">Pedir otro enlace</a>
		</Aviso>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
		<CampoTelefono
			etiqueta="Teléfono"
			name="telefono"
			autocomplete="tel"
			ayuda="El de tu cuenta."
			bind:value={$form.telefono}
			errores={$errors.telefono}
		/>
		<Campo
			etiqueta="Contraseña nueva"
			name="contrasena"
			type="password"
			autocomplete="new-password"
			ayuda="Mínimo 8 caracteres. Evita contraseñas comunes."
			bind:value={$form.contrasena}
			errores={$errors.contrasena}
		/>
		<Campo
			etiqueta="Repite la contraseña"
			name="repetir"
			type="password"
			autocomplete="new-password"
			bind:value={$form.repetir}
			errores={$errors.repetir}
		/>
		<Boton type="submit" anchoCompleto disabled={$submitting}>Guardar y entrar</Boton>
	</form>
</main>
