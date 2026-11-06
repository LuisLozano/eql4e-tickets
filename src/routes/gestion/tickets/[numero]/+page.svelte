<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { formatoNumeroTicket } from '#lib/formato.ts';
</script>

<svelte:head><title>Revisar ticket · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
	<h1 class="font-mono text-3xl font-bold">{formatoNumeroTicket(Number(page.params.numero))}</h1>
	<p class="text-muted">
		La revisión del ticket (autorizar o rechazar) llega en el siguiente paso.
	</p>
	<a href={resolve('/gestion/tickets')} class="font-bold underline">Volver al listado</a>
</main>
