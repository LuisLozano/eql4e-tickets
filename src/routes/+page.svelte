<script lang="ts">
	const estados = [
		{ clase: 'bg-pa-bg text-pa', texto: 'Pendiente de autorizar' },
		{ clase: 'bg-pp-bg text-pp', texto: 'Pendiente de pago' },
		{ clase: 'bg-pg-bg text-pg', texto: 'Pagado' },
		{ clase: 'bg-rj-bg text-rj', texto: 'Rechazado' },
		{ clase: 'bg-an-bg text-an', texto: 'Anulado' }
	];
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
		{#each estados as estado (estado.texto)}
			<li class="rounded-full px-3 py-1 text-sm font-bold {estado.clase}">{estado.texto}</li>
		{/each}
	</ul>
	<p class="font-mono text-sm text-muted">v0.1.0</p>
</main>
