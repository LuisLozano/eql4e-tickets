<script lang="ts">
	import { ArrowLeft, Euro, Paperclip } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import { ticketMarcado } from '#lib/esquemas/pago.ts';
	import { ACEPTA } from '#lib/esquemas/ticket.ts';
	import { formatoDia, formatoImporte, formatoNumeroTicket } from '#lib/formato.ts';
	import { METODOS_PAGO, TEXTO_METODO } from '#lib/pagos.ts';
	import { formatoTelefono } from '#lib/telefono.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const socio = $derived(data.socio);

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form);

	// El total se calcula con lo marcado; nunca se escribe a mano.
	const marcados = $derived(
		socio.tickets.filter((t) => $form.tickets.includes(ticketMarcado(t.numero, t.version)))
	);
	const total = $derived(marcados.reduce((suma, t) => suma + t.importeCentimos, 0));
	const plural = (n: number) => (n === 1 ? '1 ticket' : `${n} tickets`);

	let justificante = $state<string | null>(null);

	const chip =
		'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-on-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';
</script>

<svelte:head><title>Registrar pago · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
	<a
		href={resolve('/gestion/pagos')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold"
	>
		<ArrowLeft size={20} aria-hidden="true" />Pagos
	</a>

	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl font-bold">Registrar pago</h1>
		<p>
			A <span class="font-bold">{socio.nombre}</span>
			<span class="font-mono text-sm text-muted">{formatoTelefono(socio.telefono)}</span>
		</p>
	</div>

	{#if socio.tickets.length === 0}
		<p class="rounded-lg bg-sunken px-4 py-3">
			{socio.nombre} no tiene tickets pendientes de pago.
		</p>
	{:else}
		<form
			method="POST"
			enctype="multipart/form-data"
			use:enhance
			novalidate
			class="grid gap-6 lg:grid-cols-2 lg:items-start"
		>
			<input type="hidden" name="socio" value={socio.id} />

			<fieldset
				class="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
				aria-describedby={$errors.tickets?._errors ? 'tickets-error' : undefined}
			>
				<legend class="sr-only">Tickets que pagas</legend>
				<p class="font-bold">Tickets pendientes de pago</p>
				<ul class="flex flex-col divide-y divide-line">
					{#each socio.tickets as t (t.numero)}
						<li>
							<label class="flex min-h-11 cursor-pointer items-center gap-3 py-2">
								<input
									type="checkbox"
									name="tickets"
									value={ticketMarcado(t.numero, t.version)}
									bind:group={$form.tickets}
									class="size-5 shrink-0 accent-ink"
								/>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="font-mono font-bold">{formatoNumeroTicket(t.numero)}</span>
									<span class="text-sm text-muted"
										>{t.concepto} · compra {formatoDia(t.fechaCompra)}</span
									>
								</span>
								<span class="font-mono">{formatoImporte(t.importeCentimos)}</span>
							</label>
						</li>
					{/each}
				</ul>
				{#if $errors.tickets?._errors}
					<p id="tickets-error" class="text-sm font-bold text-rj">{$errors.tickets._errors[0]}</p>
				{/if}
				<p
					class="flex items-baseline justify-between gap-2 border-t border-line pt-3"
					role="status"
				>
					<span class="text-sm font-bold tracking-wide text-muted uppercase"
						>Total · {plural(marcados.length)}</span
					>
					<span class="font-mono text-2xl font-bold">{formatoImporte(total)}</span>
				</p>
			</fieldset>

			<div class="flex flex-col gap-6 rounded-lg border border-line bg-surface p-4">
				<div class="flex flex-col gap-1.5">
					<label for="fechaPago" class="font-bold">Fecha del pago</label>
					<input
						id="fechaPago"
						name="fechaPago"
						type="date"
						max={data.hoy}
						bind:value={$form.fechaPago}
						aria-invalid={$errors.fechaPago ? 'true' : undefined}
						aria-describedby={$errors.fechaPago ? 'fechaPago-error' : undefined}
						class="min-h-11 rounded-lg border border-line bg-surface px-3 font-mono text-ink"
					/>
					{#if $errors.fechaPago}
						<p id="fechaPago-error" class="text-sm font-bold text-rj">{$errors.fechaPago[0]}</p>
					{/if}
				</div>

				<fieldset
					class="flex flex-col gap-2"
					aria-describedby={$errors.metodo ? 'metodo-error' : undefined}
				>
					<legend class="mb-1.5 font-bold">Método</legend>
					<div class="flex flex-wrap gap-2">
						{#each METODOS_PAGO as m (m)}
							<label class={chip}>
								<input
									type="radio"
									name="metodo"
									value={m}
									bind:group={$form.metodo}
									class="sr-only"
								/>
								{TEXTO_METODO[m]}
							</label>
						{/each}
					</div>
					{#if $errors.metodo}
						<p id="metodo-error" class="text-sm font-bold text-rj">{$errors.metodo[0]}</p>
					{/if}
				</fieldset>

				<div class="flex flex-col gap-1.5">
					<span class="font-bold"
						>Justificante <span class="font-normal text-muted">(opcional · foto o PDF)</span></span
					>
					<label
						class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus hover:bg-sunken"
					>
						<Paperclip size={20} aria-hidden="true" />{justificante ?? 'Elegir justificante'}
						<input
							type="file"
							name="justificante"
							accept={ACEPTA}
							class="sr-only"
							aria-describedby={$errors.justificante ? 'justificante-error' : undefined}
							onchange={(e) => (justificante = e.currentTarget.files?.[0]?.name ?? null)}
						/>
					</label>
					{#if $errors.justificante}
						<p id="justificante-error" class="text-sm font-bold text-rj">
							{$errors.justificante[0]}
						</p>
					{/if}
				</div>

				<p class="rounded-lg bg-pp-bg px-4 py-3">
					Se marcarán {plural(marcados.length)} como <b>Pagado</b>. Si te equivocas, podrás deshacer
					el pago completo.
				</p>

				{#if $message}
					<Aviso>
						{$message}
						{#if page.status === 409}
							<a
								href="{resolve('/gestion/pagos/nuevo')}?socio={socio.id}"
								class="font-bold underline">Recargar la lista</a
							>
						{/if}
					</Aviso>
				{/if}
				<Boton type="submit" anchoCompleto disabled={$submitting || marcados.length === 0}>
					<Euro size={20} aria-hidden="true" />
					{$submitting ? 'Registrando…' : `Registrar pago de ${formatoImporte(total)}`}
				</Boton>
			</div>
		</form>
	{/if}
</main>
