<script lang="ts">
	import Campo from './Campo.svelte';

	// El IBAN para los pagos (HU-S07), en la activación, «Mi cuenta» y la ficha del socio.
	let {
		value = $bindable(''),
		errores,
		etiqueta = 'IBAN para recibir los pagos (opcional)',
		ayuda
	}: { value?: string; errores?: string[]; etiqueta?: string; ayuda?: string } = $props();
</script>

<Campo
	{etiqueta}
	name="iban"
	autocomplete="off"
	autocapitalize="characters"
	spellcheck="false"
	placeholder="ES00 0000 0000 0000 0000 0000"
	class="font-mono"
	{ayuda}
	bind:value
	{errores}
/>
