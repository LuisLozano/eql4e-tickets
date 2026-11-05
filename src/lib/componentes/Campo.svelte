<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		etiqueta: string;
		name: string;
		value?: string;
		ayuda?: string;
		errores?: string[];
		prefijo?: string;
	};

	let {
		etiqueta,
		name,
		value = $bindable(''),
		ayuda,
		errores,
		prefijo,
		id = name,
		...resto
	}: Props = $props();

	const idAyuda = $derived(`${id}-ayuda`);
	const idError = $derived(`${id}-error`);
	const descrito = $derived(
		[errores?.length ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="font-bold">{etiqueta}</label>
	<div
		class="flex items-center rounded-lg border bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus {errores?.length
			? 'border-rj'
			: 'border-line'}"
	>
		{#if prefijo}
			<span class="pl-3 font-mono text-muted" aria-hidden="true">{prefijo}</span>
		{/if}
		<input
			{id}
			{name}
			bind:value
			aria-invalid={errores?.length ? 'true' : undefined}
			aria-describedby={descrito}
			class="min-h-11 w-full rounded-lg border-0 bg-transparent px-3 text-ink focus:ring-0 focus:outline-none"
			{...resto}
		/>
	</div>
	{#if errores?.length}
		<p id={idError} class="text-sm font-bold text-rj">{errores[0]}</p>
	{/if}
	{#if ayuda}
		<p id={idAyuda} class="text-sm text-muted">{ayuda}</p>
	{/if}
</div>
