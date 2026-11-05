<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	// Un solo botón principal por pantalla; en el móvil va abajo y a todo el ancho (guía visual).
	type Props = HTMLButtonAttributes & {
		variante?: 'principal' | 'secundario' | 'peligro';
		anchoCompleto?: boolean;
		children: Snippet;
	};

	let {
		variante = 'principal',
		anchoCompleto = false,
		type = 'button',
		class: claseExtra = '',
		children,
		...resto
	}: Props = $props();

	const clases = {
		principal: 'bg-ink text-on-ink hover:opacity-90',
		secundario: 'border border-line bg-surface text-ink hover:bg-sunken',
		peligro: 'bg-rj text-on-ink hover:opacity-90'
	};
</script>

<button
	{type}
	class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 {clases[
		variante
	]} {anchoCompleto ? 'w-full' : ''} {claseExtra}"
	{...resto}
>
	{@render children()}
</button>
