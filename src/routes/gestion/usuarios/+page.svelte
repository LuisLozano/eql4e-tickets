<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import { formatoFecha } from '#lib/formato.ts';
	import { formatoTelefono } from '#lib/telefono.ts';
	import type { PageProps } from './$types';
	import type { ResultadoInvitacion } from './+page.server.ts';

	let { data }: PageProps = $props();
	// Superforms toma el valor inicial y se actualiza solo con cada respuesta.
	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		resetForm: true,
		onSubmit: () => {
			copiado = false;
		}
	});
	const invitacion = $derived($message as ResultadoInvitacion | undefined);

	let copiado = $state(false);
	let campoEnlace = $state<HTMLInputElement>();

	async function copiar(enlace: string) {
		try {
			await navigator.clipboard.writeText(enlace);
			copiado = true;
		} catch {
			// Sin permiso de portapapeles: se deja seleccionado para copiarlo a mano.
			campoEnlace?.select();
		}
	}

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
								<td class="px-3 py-2 font-bold">{u.nombre}</td>
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
							<span class="font-bold">{u.nombre}</span>
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
				{#if invitacion.envio === 'enviado'}
					<Aviso tipo="exito">
						Invitación enviada a {invitacion.email}. Caduca el {formatoFecha(
							new Date(invitacion.caducaEn)
						)}.
					</Aviso>
				{:else if invitacion.envio === 'desactivado'}
					<Aviso tipo="atencion">
						Usuario dado de alta. El envío de correos está desactivado: copia el enlace y envíaselo
						a {invitacion.email} por otro medio.
					</Aviso>
				{:else}
					<Aviso tipo="atencion">
						Usuario dado de alta, pero no se pudo enviar el correo a {invitacion.email}. Copia el
						enlace y envíaselo por otro medio.
					</Aviso>
				{/if}
				<div class="flex flex-col gap-1.5">
					<label for="enlace" class="font-bold">Enlace de activación</label>
					<div class="flex gap-2">
						<input
							id="enlace"
							bind:this={campoEnlace}
							readonly
							value={invitacion.enlace}
							class="min-h-11 w-full min-w-0 rounded-lg border border-line bg-sunken px-3 font-mono text-sm"
						/>
						<Boton variante="secundario" onclick={() => copiar(invitacion.enlace)}>
							{copiado ? 'Copiado' : 'Copiar enlace'}
						</Boton>
					</div>
					<p class="text-sm text-muted">
						Caduca el {formatoFecha(new Date(invitacion.caducaEn))}. Solo se muestra ahora.
					</p>
				</div>
			{/if}

			<form method="POST" action="?/alta" use:enhance class="flex flex-col gap-4" novalidate>
				<Campo
					etiqueta="Nombre"
					name="nombre"
					autocomplete="off"
					bind:value={$form.nombre}
					errores={$errors.nombre}
				/>
				<Campo
					etiqueta="Teléfono"
					name="telefono"
					type="tel"
					inputmode="tel"
					autocomplete="off"
					placeholder="612 345 678"
					bind:value={$form.telefono}
					errores={$errors.telefono}
				/>
				<Campo
					etiqueta="Email"
					name="email"
					type="email"
					autocomplete="off"
					bind:value={$form.email}
					errores={$errors.email}
				/>
				<fieldset
					class="flex flex-col gap-1.5"
					aria-describedby={$errors.esSocio?.length ? 'roles-error' : undefined}
				>
					<legend class="mb-1.5 font-bold">Roles</legend>
					<div class="flex gap-6">
						<label class="flex min-h-11 items-center gap-2">
							<input
								type="checkbox"
								name="esSocio"
								bind:checked={$form.esSocio}
								class="size-5 rounded border-line"
							/>
							Socio
						</label>
						<label class="flex min-h-11 items-center gap-2">
							<input
								type="checkbox"
								name="esTesorero"
								bind:checked={$form.esTesorero}
								class="size-5 rounded border-line"
							/>
							Tesorero
						</label>
					</div>
					{#if $errors.esSocio?.length}
						<p id="roles-error" class="text-sm font-bold text-rj">{$errors.esSocio[0]}</p>
					{/if}
				</fieldset>
				<Boton type="submit" anchoCompleto disabled={$submitting}>
					Dar de alta y enviar invitación
				</Boton>
			</form>
		</section>
	</div>
</main>
