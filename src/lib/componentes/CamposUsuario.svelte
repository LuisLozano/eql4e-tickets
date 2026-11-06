<script lang="ts">
	import type { SuperFormData } from 'sveltekit-superforms/client';
	import Campo from '#lib/componentes/Campo.svelte';
	import CampoTelefono from '#lib/componentes/CampoTelefono.svelte';
	import type { CamposUsuario } from '#lib/esquemas/usuario.ts';

	// Los datos de un usuario, para el alta (HU-G01) y para editarlo (HU-G03). La página pone el
	// <form>, el superForm y el botón.
	let {
		form,
		errores
	}: {
		form: SuperFormData<CamposUsuario>;
		errores: Partial<Record<keyof CamposUsuario, string[]>>;
	} = $props();
</script>

<Campo
	etiqueta="Nombre"
	name="nombre"
	autocomplete="off"
	bind:value={$form.nombre}
	errores={errores.nombre}
/>
<CampoTelefono
	etiqueta="Teléfono"
	name="telefono"
	autocomplete="off"
	bind:value={$form.telefono}
	errores={errores.telefono}
/>
<Campo
	etiqueta="Email"
	name="email"
	type="email"
	autocomplete="off"
	bind:value={$form.email}
	errores={errores.email}
/>
<fieldset
	class="flex flex-col gap-1.5"
	aria-describedby={errores.esSocio?.length ? 'roles-error' : undefined}
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
	{#if errores.esSocio?.length}
		<p id="roles-error" class="text-sm font-bold text-rj">{errores.esSocio[0]}</p>
	{/if}
</fieldset>
