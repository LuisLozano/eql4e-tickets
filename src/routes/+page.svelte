<script lang="ts">
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import { ESTADOS_TICKET } from '#lib/estados.ts';
</script>

<svelte:head>
	<title>Tickets · eql4e</title>
</svelte:head>

<main
	class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center"
>
	<img src="/logo.png" alt="Logo de la asociación" width="120" height="120" class="dark:invert" />
	<h1 class="font-display text-3xl font-bold text-balance">Tickets de la asociación</h1>
	<p class="text-muted">
		La aplicación está en construcción. Pronto podrás enviar aquí tus tickets de compra.
	</p>
	<ul class="flex flex-wrap justify-center gap-2" aria-label="Estados de un ticket">
		{#each ESTADOS_TICKET as estado (estado)}
			<li><EstadoInsignia {estado} /></li>
		{/each}
	</ul>
	<p class="font-mono text-sm text-muted">v0.1.0</p>
</main>
