<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Campo from './Campo.svelte';
	import { formatoAlEscribir, posicionTras } from '#lib/telefono.ts';

	type Props = Omit<HTMLInputAttributes, 'type' | 'inputmode' | 'oninput'> & {
		etiqueta: string;
		name: string;
		value?: string;
		ayuda?: string;
		errores?: string[];
	};
	let { value = $bindable(''), placeholder = '612 345 678', ...resto }: Props = $props();

	// Agrupa las cifras al escribir y deja el cursor tras la misma cifra. Al borrar no se toca,
	// para que la tecla de borrar no choque con los espacios. El servidor normaliza igualmente.
	function formatear(e: Event & { currentTarget: HTMLInputElement }) {
		const campo = e.currentTarget;
		if (e instanceof InputEvent && e.inputType.startsWith('delete')) return;
		const nuevo = formatoAlEscribir(campo.value);
		if (nuevo === campo.value) return;
		const antes = campo.value.slice(0, campo.selectionStart ?? campo.value.length);
		const significativos = antes.replace(/[^\d+]/g, '').length;
		campo.value = nuevo;
		const posicion = posicionTras(nuevo, significativos);
		campo.setSelectionRange(posicion, posicion);
		value = nuevo;
	}
</script>

<Campo bind:value type="tel" inputmode="tel" {placeholder} oninput={formatear} {...resto} />
