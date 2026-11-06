<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { resolve } from '$app/paths';
	import Boton from '#lib/componentes/Boton.svelte';
	import CamposUsuario from '#lib/componentes/CamposUsuario.svelte';
	import EnlaceActivacion from '#lib/componentes/EnlaceActivacion.svelte';
	import { formatoFecha } from '#lib/formato.ts';
	import type { ResultadoInvitacion } from '#lib/server/web/invitacion.ts';
	import { formatoTelefono } from '#lib/telefono.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, { resetForm: true });
	const invitacion = $derived($message as ResultadoInvitacion | undefined);

	type Usuario = (typeof data.usuarios)[number];
	const roles = (u: Usuario) =>
		[u.esSocio && 'Socio', u.esTesorero && 'Tesorero'].filter(Boolean).join(' · ');
	const estado = (u: Usuario) => {
		if (u.estado === 'activo') return { texto: 'Activo', clase: 'bg-pg-bg text-pg' };
		if (u.estado === 'baja') return { texto: 'De baja', clase: 'bg-an-bg text-an' };
		return u.invitacionCaducaEn
			? {
					texto: `Invitado · caduca ${formatoFecha(u.invitacionCaducaEn)}`,
					clase: 'bg-pa-bg text-pa'
				}
			: { texto: 'Invitación caducada', clase: 'bg-rj-bg text-rj' };
	};
</script>

<svelte:head><title>Usuarios · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
	<h1 class="font-display text-3xl font-bold">Usuarios</h1>

	<div class="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
		<section aria-labelledby="titulo-lista" class="flex min-w-0 flex-col gap-3">
			<h2 id="titulo-lista" class="sr-only">Lista de usuarios</h2>

			<!-- Escritorio: tabla. Móvil: lista (guía visual, por debajo de 1024 px). -->
			<div class="hidden overflow-x-auto rounded-lg border border-line bg-surface lg:block">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-line text-muted">
						<tr>
							<th class="px-3 py-2">Nombre</th>
							<th class="px-3 py-2">Teléfono</th>
							<th class="px-3 py-2">Email</th>
							<th class="px-3 py-2">Roles</th>
							<th class="px-3 py-2">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each data.usuarios as u (u.id)}
							{@const e = estado(u)}
							<tr
								class="border-b border-line last:border-0 {u.estado === 'baja' ? 'text-muted' : ''}"
							>
								<td class="px-3 py-2 font-bold">
									<a href={resolve('/gestion/usuarios/[id]', { id: u.id })} class="underline"
										>{u.nombre}</a
									>
								</td>
								<td class="px-3 py-2 font-mono whitespace-nowrap">{formatoTelefono(u.telefono)}</td>
								<td class="px-3 py-2 break-all">{u.email}</td>
								<td class="px-3 py-2 whitespace-nowrap">{roles(u)}</td>
								<td class="px-3 py-2">
									<span
										class="rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap {e.clase}"
										>{e.texto}</span
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<ul class="flex flex-col gap-2 lg:hidden">
				{#each data.usuarios as u (u.id)}
					{@const e = estado(u)}
					<li
						class="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 {u.estado ===
						'baja'
							? 'text-muted'
							: ''}"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<a href={resolve('/gestion/usuarios/[id]', { id: u.id })} class="font-bold underline"
								>{u.nombre}</a
							>
							<span class="rounded-full px-2 py-0.5 text-xs font-bold {e.clase}">{e.texto}</span>
						</div>
						<span class="font-mono text-sm">{formatoTelefono(u.telefono)}</span>
						<span class="text-sm break-all">{u.email}</span>
						<span class="text-sm text-muted">{roles(u)}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section
			aria-labelledby="titulo-alta"
			class="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
		>
			<h2 id="titulo-alta" class="font-display text-xl font-bold">Nuevo usuario</h2>

			{#if invitacion}
				<EnlaceActivacion {invitacion} hecho="Usuario dado de alta" />
			{/if}

			<form method="POST" action="?/alta" use:enhance class="flex flex-col gap-4" novalidate>
				<CamposUsuario {form} errores={$errors} />
				<Boton type="submit" anchoCompleto disabled={$submitting}>
					Dar de alta y enviar invitación
				</Boton>
			</form>
		</section>
	</div>
</main>
