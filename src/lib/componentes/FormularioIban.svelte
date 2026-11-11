<script lang="ts">
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import Aviso from './Aviso.svelte';
	import Boton from './Boton.svelte';
	import CampoIban from './CampoIban.svelte';

	// Guardar o borrar el IBAN (HU-S07): el socio en «Mi cuenta» y el tesorero en la ficha.
	let {
		datos,
		ayuda,
		anchoCompleto = false
	}: { datos: SuperValidated<{ iban: string }>; ayuda: string; anchoCompleto?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(datos, { resetForm: false });
</script>

{#if $message}<Aviso tipo="exito">{$message}</Aviso>{/if}
<form method="POST" action="?/cambiarIban" use:enhance class="flex flex-col gap-4" novalidate>
	<CampoIban etiqueta="IBAN" {ayuda} bind:value={$form.iban} errores={$errors.iban} />
	<Boton
		type="submit"
		{anchoCompleto}
		class={anchoCompleto ? undefined : 'self-start'}
		disabled={$submitting}>Guardar el IBAN</Boton
	>
</form>
