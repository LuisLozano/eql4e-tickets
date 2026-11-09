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

<svelte:head><title>Entrar · Tickets</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
	<div class="flex flex-col items-center gap-2 text-center">
		<img src="/logo.png" alt="" width="96" height="96" class="dark:invert" />
		<h1 class="font-display text-3xl font-bold">EQL4E Tickets</h1>
		<p class="text-muted">Reembolso de compras de la asociación</p>
	</div>

	{#if $message}<Aviso>{$message}</Aviso>{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
		<CampoTelefono
			etiqueta="Teléfono"
			name="telefono"
			autocomplete="tel"
			bind:value={$form.telefono}
			errores={$errors.telefono}
		/>
		<Campo
			etiqueta="Contraseña"
			name="contrasena"
			type="password"
			autocomplete="current-password"
			bind:value={$form.contrasena}
			errores={$errors.contrasena}
		/>
		<Boton type="submit" anchoCompleto disabled={$submitting}>Entrar</Boton>
	</form>

	{#if data.correoActivo}
		<p class="text-center text-sm">
			<a href={resolve('/restablecer')} class="font-bold underline">¿Has olvidado tu contraseña?</a>
		</p>
	{/if}

	<p class="text-center text-sm text-muted">
		¿Aún no tienes cuenta? Pide la invitación a un tesorero.
		<a href={resolve('/ayuda')} class="font-bold underline">Ayuda</a>
	</p>
</main>
