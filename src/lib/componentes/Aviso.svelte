<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tipo = 'error', children }: { tipo?: 'error' | 'exito'; children: Snippet } = $props();
</script>

<div
	role={tipo === 'error' ? 'alert' : 'status'}
	class="rounded-lg px-4 py-3 font-bold {tipo === 'error'
		? 'bg-rj-bg text-rj'
		: 'bg-pg-bg text-pg'}"
>
	{@render children()}
</div>
