<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { resolve } from '$app/paths';
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
			class="font-mono tracking-tighter"
			bind:value={$form.codigo}
			errores={$errors.codigo}
		/>
		<CampoTelefono
			etiqueta="Teléfono"
			name="telefono"
			autocomplete="tel"
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

	<p class="text-center text-sm text-muted">
		Cómo activar la cuenta e instalar la app en el móvil:
		<a href={resolve('/ayuda')} class="font-bold underline">Ayuda</a>
	</p>
</main>
