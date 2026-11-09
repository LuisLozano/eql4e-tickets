<script lang="ts">
	import { resolve } from '$app/paths';
	import { superForm } from 'sveltekit-superforms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import CampoTelefono from '#lib/componentes/CampoTelefono.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form);
</script>

<svelte:head><title>Contraseña olvidada · Tickets</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">¿Has olvidado tu contraseña?</h1>
		<p class="text-muted">
			Escribe tu teléfono y te enviaremos a tu email un enlace para elegir una contraseña nueva.
		</p>
	</div>

	{#if !data.correoActivo}
		<Aviso tipo="atencion">
			Ahora mismo la app no envía correos. Pide a un tesorero que te reenvíe la invitación.
		</Aviso>
	{/if}

	{#if $message === 'enviado'}
		<Aviso tipo="exito">
			Si el teléfono es de una cuenta activa, te hemos enviado un enlace a su email. Caduca en 1
			hora. Si no te llega, mira en la carpeta de spam o pide a un tesorero que te reenvíe la
			invitación.
		</Aviso>
	{:else}
		{#if $message}<Aviso>{$message}</Aviso>{/if}
		<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
			<CampoTelefono
				etiqueta="Teléfono"
				name="telefono"
				autocomplete="tel"
				bind:value={$form.telefono}
				errores={$errors.telefono}
			/>
			<Boton type="submit" anchoCompleto disabled={$submitting}>Enviar enlace</Boton>
		</form>
	{/if}

	<p class="text-center text-sm">
		<a href={resolve('/entrar')} class="font-bold underline">Volver a Entrar</a>
	</p>
</main>
