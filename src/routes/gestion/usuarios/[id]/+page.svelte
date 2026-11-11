<script lang="ts">
	import { ArrowLeft, Mail, RotateCcw, UserX } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import CamposUsuario from '#lib/componentes/CamposUsuario.svelte';
	import EnlaceActivacion from '#lib/componentes/EnlaceActivacion.svelte';
	import FormularioIban from '#lib/componentes/FormularioIban.svelte';
	import { formatoFecha } from '#lib/formato.ts';
	import type { PageProps } from './$types';

	let { data, form: resultado }: PageProps = $props();
	const u = $derived(data.usuario);

	// svelte-ignore state_referenced_locally
	const {
		form,
		errors,
		message,
		enhance: enhanceDatos,
		submitting
	} = superForm(data.form, {
		resetForm: false
	});

	const estado = $derived.by(() => {
		if (u.estado === 'activo') return 'Activo: puede entrar con su contraseña.';
		if (u.estado === 'baja') return 'De baja: no puede entrar. Sus tickets se conservan.';
		return u.invitacionCaducaEn
			? `Invitado: todavía no ha activado su cuenta. La invitación caduca el ${formatoFecha(u.invitacionCaducaEn)}.`
			: 'Invitado: todavía no ha activado su cuenta y la invitación ha caducado.';
	});

	// La baja se confirma en la propia página (guía de diseño).
	let confirmando = $state(false);
	let enviando = $state(false);
	let pregunta: HTMLElement | undefined = $state();

	async function confirmar() {
		confirmando = true;
		await tick();
		pregunta?.focus();
	}

	/** Para los formularios de acceso: al terminar, se recarga la ficha y se cierra la confirmación. */
	const alEnviar = () => {
		enviando = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			confirmando = enviando = false;
		};
	};
</script>

<svelte:head><title>{u.nombre} · Usuarios</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<a
		href={resolve('/gestion/usuarios')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold"
	>
		<ArrowLeft size={20} aria-hidden="true" />Usuarios
	</a>

	<h1 class="font-display text-3xl font-bold break-words">{u.nombre}</h1>

	{#if resultado?.aviso}
		<Aviso tipo="exito">{resultado.aviso}</Aviso>
	{:else if resultado?.error}
		<Aviso>{resultado.error}</Aviso>
	{/if}
	{#if u.ficticio}
		<Aviso tipo="atencion">
			Este es el tesorero inicial, con datos ficticios. Pon {data.yo ? 'tus' : 'sus'} datos reales: nombre,
			teléfono y email.
		</Aviso>
	{/if}

	<section
		aria-labelledby="titulo-datos"
		class="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
	>
		<h2 id="titulo-datos" class="font-display text-xl font-bold">Datos</h2>
		{#if $message}<Aviso tipo="exito">{$message}</Aviso>{/if}
		<form method="POST" action="?/guardar" use:enhanceDatos class="flex flex-col gap-4" novalidate>
			<CamposUsuario {form} errores={$errors} />
			{#if $errors.esTesorero?.length}
				<p class="text-sm font-bold text-rj">{$errors.esTesorero[0]}</p>
			{/if}
			<Boton type="submit" class="self-start" disabled={$submitting}>Guardar cambios</Boton>
		</form>
	</section>

	{#if data.formIban}
		<section
			aria-labelledby="titulo-iban"
			class="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
		>
			<h2 id="titulo-iban" class="font-display text-xl font-bold">Cuenta para los pagos</h2>
			<FormularioIban
				datos={data.formIban}
				ayuda="Normalmente lo pone el socio al activar su cuenta o en «Mi cuenta». Vacío, lo borra."
			/>
		</section>
	{/if}

	<section
		aria-labelledby="titulo-acceso"
		class="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
	>
		<h2 id="titulo-acceso" class="font-display text-xl font-bold">Acceso</h2>
		<p>{estado}</p>

		{#if resultado?.invitacion}
			<EnlaceActivacion
				invitacion={resultado.invitacion}
				hecho={resultado.restablecer ? 'Enlace generado' : 'Invitación generada'}
			/>
		{/if}

		{#if confirmando}
			<div class="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-4 shadow-sm">
				<h3 bind:this={pregunta} tabindex="-1" class="text-xl font-bold">
					¿Dar de baja a {u.nombre}?
				</h3>
				<p class="text-muted">
					No podrá entrar y se cerrarán sus sesiones. Sus tickets se conservan y puedes reactivarlo
					cuando quieras.
				</p>
				<form method="POST" action="?/baja" use:enhance={alEnviar} class="flex flex-wrap gap-2">
					<Boton type="submit" variante="peligro" disabled={enviando}
						><UserX size={20} aria-hidden="true" />Dar de baja</Boton
					>
					<Boton variante="secundario" onclick={() => (confirmando = false)}>Cancelar</Boton>
				</form>
			</div>
		{:else if u.estado === 'baja'}
			<form method="POST" action="?/reactivar" use:enhance={alEnviar}>
				<Boton type="submit" variante="secundario" disabled={enviando}
					><RotateCcw size={20} aria-hidden="true" />Reactivar</Boton
				>
			</form>
		{:else}
			{#if u.estado === 'activo'}
				<p class="text-sm text-muted">
					Si ha olvidado su contraseña, envíale un enlace para elegir otra. La actual sigue valiendo
					hasta que lo use.
				</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<form method="POST" action="?/reenviar" use:enhance={alEnviar}>
					<Boton type="submit" variante="secundario" disabled={enviando}
						><Mail size={20} aria-hidden="true" />{u.estado === 'activo'
							? 'Enviar enlace para otra contraseña'
							: 'Reenviar invitación'}</Boton
					>
				</form>
				{#if !data.yo}
					<Boton variante="secundario" onclick={confirmar}
						><UserX size={20} aria-hidden="true" />Dar de baja…</Boton
					>
				{/if}
			</div>
		{/if}
	</section>
</main>
