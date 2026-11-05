<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tipo = 'error', children }: { tipo?: 'error' | 'exito' | 'atencion'; children: Snippet } =
		$props();

	const clases = {
		error: 'bg-rj-bg text-rj',
		exito: 'bg-pg-bg text-pg',
		atencion: 'bg-pa-bg text-pa'
	};
</script>

<div
	role={tipo === 'error' ? 'alert' : 'status'}
	class="rounded-lg px-4 py-3 font-bold {clases[tipo]}"
>
	{@render children()}
</div>
