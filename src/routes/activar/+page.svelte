<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form);
</script>

<svelte:head><title>Activar cuenta · Tickets</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">Activa tu cuenta</h1>
		<p class="text-muted">Elige una contraseña para empezar a enviar tickets.</p>
	</div>

	{#if $message}<Aviso>{$message}</Aviso>{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
		<Campo
			etiqueta="Código de invitación"
			name="codigo"
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			class="font-mono"
			bind:value={$form.codigo}
			errores={$errors.codigo}
		/>
		<Campo
			etiqueta="Teléfono"
			name="telefono"
			type="tel"
			inputmode="tel"
			autocomplete="tel"
			placeholder="612 345 678"
			ayuda="El mismo que dio la asociación al darte de alta."
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
		<p class="text-sm text-muted">
			La asociación usa tu nombre, teléfono y email solo para gestionar reembolsos. Los tickets se
			borran a los 18 meses de la fecha de compra.
		</p>
		<Boton type="submit" anchoCompleto disabled={$submitting}>Activar y entrar</Boton>
	</form>
</main>
