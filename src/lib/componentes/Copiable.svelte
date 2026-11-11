<script lang="ts">
	import Boton from './Boton.svelte';

	// Un texto de solo lectura con su botón de copiar: el enlace de activación o el IBAN del socio.
	let {
		id,
		etiqueta,
		valor,
		copiar = valor,
		boton
	}: {
		id: string;
		etiqueta: string;
		/** Lo que se ve. */
		valor: string;
		/** Lo que se copia, si es distinto (el IBAN se copia sin espacios). */
		copiar?: string;
		boton: string;
	} = $props();

	let copiado = $state(false);
	let campo = $state<HTMLInputElement>();
	// Un valor nuevo vuelve a mostrar el botón de copiar.
	$effect(() => {
		void copiar;
		copiado = false;
	});

	async function alPulsar() {
		try {
			await navigator.clipboard.writeText(copiar);
			copiado = true;
		} catch {
			// Sin permiso de portapapeles: se deja seleccionado para copiarlo a mano.
			campo?.select();
		}
	}
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="font-bold">{etiqueta}</label>
	<!-- En el móvil, el botón baja de línea para que el texto se lea entero. -->
	<div class="flex flex-wrap gap-2">
		<input
			{id}
			bind:this={campo}
			readonly
			value={valor}
			class="min-h-11 min-w-0 flex-1 basis-72 rounded-lg border border-line bg-sunken px-3 font-mono text-sm"
		/>
		<Boton variante="secundario" class="whitespace-nowrap" onclick={alPulsar}
			>{copiado ? 'Copiado' : boton}</Boton
		>
	</div>
</div>
