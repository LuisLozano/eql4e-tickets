<script lang="ts">
	import { ArrowLeft, Check, Euro, Lock, Undo2, X } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import DatosTicket from '#lib/componentes/DatosTicket.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import FicherosTicket from '#lib/componentes/FicherosTicket.svelte';
	import HistorialTicket from '#lib/componentes/HistorialTicket.svelte';
	import PagoTicket from '#lib/componentes/PagoTicket.svelte';
	import { MOTIVO_MAXIMO } from '#lib/esquemas/revision.ts';
	import { formatoNumeroTicket } from '#lib/formato.ts';
	import { refrescoAutomatico } from '#lib/cliente/refresco.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	refrescoAutomatico();
	const t = $derived(data.ticket);

	// svelte-ignore state_referenced_locally
	const rechazar = superForm(data.rechazar, {
		resetForm: true,
		// Si otro tesorero se adelantó (E-04), se recarga para ver cómo está ahora.
		onResult: async ({ result }) => {
			if (result.type === 'failure' && result.status === 409) await invalidateAll();
		}
	});
	const { form: datosRechazo, errors: erroresRechazo, enhance: enhanceRechazo } = rechazar;

	// svelte-ignore state_referenced_locally
	const deshacer = superForm(data.formDeshacer, {
		resetForm: true,
		onResult: async ({ result }) => {
			if (result.type === 'success') deshaciendo = false;
			if (result.type === 'failure' && result.status === 409) await invalidateAll();
		}
	});
	const { form: datosDeshacer, errors: erroresDeshacer, enhance: enhanceDeshacer } = deshacer;
	let deshaciendo = $state(false);
	const TEXTO_DESHACER = {
		deshacer_autorizacion: 'Deshacer autorización',
		deshacer_rechazo: 'Deshacer rechazo'
	} as const;

	const pendiente = $derived(t.estado === 'pendiente_autorizar');
	let rechazando = $state(false);
	let enviando = $state(false);
</script>

<svelte:head><title>{formatoNumeroTicket(t.numero)} · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
	<a
		href={resolve('/gestion/tickets')}
		class="inline-flex min-h-11 items-center gap-2 self-start font-bold"
	>
		<ArrowLeft size={20} aria-hidden="true" />Tickets
	</a>

	<div class="flex flex-wrap items-center gap-3">
		<h1 class="font-mono text-3xl font-bold">{formatoNumeroTicket(t.numero)}</h1>
		<EstadoInsignia estado={t.estado} />
	</div>

	{#if form?.aviso}
		<Aviso tipo="exito">{form.aviso}</Aviso>
	{:else if form?.error}
		<Aviso>{form.error}</Aviso>
	{/if}

	<!-- En ordenador, la foto ocupa la mitad: es lo que hay que comprobar. -->
	<div class="grid gap-6 lg:grid-cols-2 lg:items-start">
		<FicherosTicket ficheros={t.ficheros} />

		<div class="flex flex-col gap-6">
			<DatosTicket ticket={t} socio={t.socio} />

			{#if t.estado === 'rechazado' && t.motivoRechazo}
				<section
					aria-labelledby="titulo-motivo"
					class="flex flex-col gap-1 rounded-lg border-l-4 border-rj bg-rj-bg px-4 py-3"
				>
					<h2 id="titulo-motivo" class="font-bold text-rj">Motivo del rechazo</h2>
					<p class="break-words">{t.motivoRechazo}</p>
				</section>
			{/if}

			{#if t.pago}
				<PagoTicket pago={t.pago} detalle />
			{/if}

			{#if t.estado === 'pendiente_pago'}
				{#if data.propio}
					<p class="flex items-start gap-2 rounded-lg bg-sunken px-4 py-3">
						<Lock size={20} aria-hidden="true" class="mt-0.5 shrink-0" />
						Es tu ticket: lo tiene que pagar otro tesorero.
					</p>
				{:else}
					<a
						href="{resolve('/gestion/pagos/nuevo')}?socio={t.socioId}&ticket={t.numero}"
						class="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-ink px-4 font-bold text-on-ink hover:opacity-90"
						><Euro size={20} aria-hidden="true" />Registrar pago</a
					>
				{/if}
			{/if}

			{#if data.propio && pendiente}
				<p class="flex items-start gap-2 rounded-lg bg-sunken px-4 py-3">
					<Lock size={20} aria-hidden="true" class="mt-0.5 shrink-0" />
					Es tu ticket: lo tiene que autorizar o rechazar otro tesorero.
				</p>
			{/if}

			{#if data.acciones.length}
				<!-- En el móvil, las acciones quedan fijas abajo. -->
				<section
					aria-label="Acciones"
					class="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:rounded-lg lg:border"
				>
					{#if rechazando}
						<form method="POST" action="?/rechazar" use:enhanceRechazo class="flex flex-col gap-3">
							<input type="hidden" name="version" value={t.version} />
							<div class="flex flex-col gap-1.5">
								<label for="motivo" class="font-bold">Motivo del rechazo</label>
								<textarea
									id="motivo"
									name="motivo"
									rows="3"
									maxlength={MOTIVO_MAXIMO}
									placeholder="Ej.: la foto está borrosa y no se lee el importe"
									aria-invalid={$erroresRechazo.motivo ? 'true' : undefined}
									aria-describedby="motivo-ayuda{$erroresRechazo.motivo ? ' motivo-error' : ''}"
									bind:value={$datosRechazo.motivo}
									class="rounded-lg border border-line bg-surface px-3 py-2 text-ink"></textarea>
								{#if $erroresRechazo.motivo}
									<p id="motivo-error" class="text-sm font-bold text-rj">
										{$erroresRechazo.motivo[0]}
									</p>
								{/if}
								<p id="motivo-ayuda" class="text-sm text-muted">El socio lo verá en su ticket.</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<Boton type="submit" variante="peligro"
									><X size={20} aria-hidden="true" />Confirmar rechazo</Boton
								>
								<Boton variante="secundario" onclick={() => (rechazando = false)}>Cancelar</Boton>
							</div>
						</form>
					{:else}
						<div class="grid grid-cols-2 gap-2 lg:flex">
							{#if data.acciones.includes('autorizar')}
								<form
									method="POST"
									action="?/autorizar"
									use:enhance={() => {
										enviando = true;
										return async ({ result, update }) => {
											await update();
											if (result.type === 'failure') await invalidateAll();
											enviando = false;
										};
									}}
									class="contents"
								>
									<input type="hidden" name="version" value={t.version} />
									<Boton type="submit" disabled={enviando}
										><Check size={20} aria-hidden="true" />Autorizar</Boton
									>
								</form>
							{/if}
							{#if data.acciones.includes('rechazar')}
								<Boton variante="secundario" onclick={() => (rechazando = true)}
									><X size={20} aria-hidden="true" />Rechazar</Boton
								>
							{/if}
						</div>
					{/if}
				</section>
			{/if}

			{#if data.deshacer}
				<section aria-label="Deshacer" class="flex flex-col gap-3">
					{#if deshaciendo}
						<form
							method="POST"
							action="?/deshacer"
							use:enhanceDeshacer
							class="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
						>
							<input type="hidden" name="version" value={t.version} />
							<input type="hidden" name="accion" value={data.deshacer} />
							<div class="flex flex-col gap-1.5">
								<label for="motivo-deshacer" class="font-bold">¿Por qué lo deshaces?</label>
								<textarea
									id="motivo-deshacer"
									name="motivo"
									rows="3"
									maxlength={MOTIVO_MAXIMO}
									placeholder="Ej.: lo autoricé por error, el importe no coincide"
									aria-invalid={$erroresDeshacer.motivo ? 'true' : undefined}
									aria-describedby="deshacer-ayuda{$erroresDeshacer.motivo
										? ' deshacer-error'
										: ''}"
									bind:value={$datosDeshacer.motivo}
									class="rounded-lg border border-line bg-surface px-3 py-2 text-ink"></textarea>
								{#if $erroresDeshacer.motivo}
									<p id="deshacer-error" class="text-sm font-bold text-rj">
										{$erroresDeshacer.motivo[0]}
									</p>
								{/if}
								<p id="deshacer-ayuda" class="text-sm text-muted">
									Vuelve a Pendiente de autorizar. El motivo queda en el historial, y el socio lo
									ve.
								</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<Boton type="submit" variante="peligro"
									><Undo2 size={20} aria-hidden="true" />{TEXTO_DESHACER[data.deshacer]}</Boton
								>
								<Boton variante="secundario" onclick={() => (deshaciendo = false)}>Cancelar</Boton>
							</div>
						</form>
					{:else}
						<Boton variante="secundario" class="self-start" onclick={() => (deshaciendo = true)}
							><Undo2 size={20} aria-hidden="true" />{TEXTO_DESHACER[data.deshacer]}…</Boton
						>
					{/if}
				</section>
			{/if}

			<HistorialTicket
				historial={t.historial}
				yo={data.yo}
				ficheros={[...t.ficheros, ...t.sustituidos]}
			/>
		</div>
	</div>
</main>
