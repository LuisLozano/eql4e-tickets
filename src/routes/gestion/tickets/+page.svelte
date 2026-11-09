<script lang="ts">
	import { ArrowDown, ArrowUp, ChevronDown, Download, Lock } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import Campo from '#lib/componentes/Campo.svelte';
	import EstadoInsignia from '#lib/componentes/EstadoInsignia.svelte';
	import { ESTADOS_TICKET, TEXTO_ESTADO } from '#lib/estados.ts';
	import {
		centimosATexto,
		ESTADOS_POR_DEFECTO,
		FILTROS_INICIALES,
		consulta,
		estadoCambiado,
		filtrosActivos,
		ordenarPor,
		type FiltrosListado,
		type Orden
	} from '#lib/listado-tickets.ts';
	import {
		formatoDia,
		formatoFechaHora,
		formatoImporte,
		formatoNumeroTicket
	} from '#lib/formato.ts';
	import { ticketMarcado } from '#lib/esquemas/pago.ts';
	import { refrescoAutomatico } from '#lib/cliente/refresco.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form: resultado }: PageProps = $props();
	refrescoAutomatico();

	const lista = resolve('/gestion/tickets');
	const f = $derived(data.filtros);
	// Filtros del panel (no el estado, que se ve en las casillas): solo con ellos se abre al cargar.
	const activos = $derived(filtrosActivos(f));
	const algunFiltro = $derived(activos > 0 || estadoCambiado(f));
	/** La parte «?…» de un enlace: lo aplicado con algún cambio, y de vuelta a la página 1. */
	const q = (cambios: Partial<FiltrosListado>) => consulta({ ...f, pagina: 1, ...cambios });

	const COLUMNAS: { orden: Orden; texto: string; derecha?: boolean }[] = [
		{ orden: 'estado', texto: 'Estado' },
		{ orden: 'compra', texto: 'Compra' },
		{ orden: 'socio', texto: 'Socio' },
		{ orden: 'concepto', texto: 'Concepto' },
		{ orden: 'importe', texto: 'Importe', derecha: true },
		{ orden: 'enviado', texto: 'Enviado' }
	];
	const TEXTO_ORDEN = Object.fromEntries(COLUMNAS.map((c) => [c.orden, c.texto]));

	const nombreConcepto = (t: { concepto: string | null; conceptoOtro: string | null }) =>
		t.concepto ?? `Otro: ${t.conceptoOtro}`;
	const detalle = (numero: number) =>
		resolve('/gestion/tickets/[numero]', { numero: String(numero) });

	/**
	 * El formulario va por GET. Para que la URL quede limpia, los campos vacíos y el orden por defecto
	 * no se envían: se desactivan justo antes y se reactivan en cuanto SvelteKit ha leído el formulario.
	 */
	function limpiar(evento: SubmitEvent & { currentTarget: HTMLFormElement }) {
		const campos = [...evento.currentTarget.elements].filter(
			(e): e is HTMLInputElement | HTMLSelectElement =>
				e instanceof HTMLInputElement || e instanceof HTMLSelectElement
		);
		const valor = (nombre: string) => campos.find((c) => c.name === nombre)?.value;
		const ordenPorDefecto = valor('orden') === 'estado' && valor('dir') === 'asc';
		// Los estados: «todos» solo hace falta si no se ha marcado ninguno, y los de por defecto no se
		// escriben.
		const marcados = campos.filter(
			(c) =>
				c.name === 'estado' && c instanceof HTMLInputElement && c.type === 'checkbox' && c.checked
		);
		const estadoPorDefecto =
			marcados.length === ESTADOS_POR_DEFECTO.length &&
			marcados.every((c) => (ESTADOS_POR_DEFECTO as readonly string[]).includes(c.value));
		const sobran = campos.filter(
			(c) =>
				c.value === '' ||
				(ordenPorDefecto && (c.name === 'orden' || c.name === 'dir')) ||
				(c.name === 'estado' && c.value === 'todos' && marcados.length > 0) ||
				(estadoPorDefecto && marcados.includes(c))
		);
		for (const c of sobran) c.disabled = true;
		setTimeout(() => sobran.forEach((c) => (c.disabled = false)));
	}

	// Autorización múltiple (HU-T03): solo se marcan los pendientes de autorizar que no son tuyos (R-04).
	type Fila = (typeof data.filas)[number];
	const marca = (t: Fila) => ticketMarcado(t.numero, t.version);
	const autorizables = $derived(
		data.filas.filter((t) => t.estado === 'pendiente_autorizar' && t.socioId !== data.yo)
	);
	let marcados = $state<string[]>([]);
	// Los de esta página: al cambiar de filtro o de página, lo que ya no se ve no cuenta.
	const seleccion = $derived(marcados.filter((m) => autorizables.some((t) => marca(t) === m)));
	const todos = $derived(autorizables.length > 0 && seleccion.length === autorizables.length);
	let autorizando = $state(false);
	// La acción con los filtros de la vista: «?/autorizar» a secas cambiaría la URL y se perderían.
	const accionAutorizar = $derived(`${consulta(f) ? `${consulta(f)}&` : '?'}/autorizar`);

	const claseCampo =
		'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus';
	const claseFicha =
		'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-bold whitespace-nowrap has-checked:border-ink has-checked:bg-ink has-checked:text-on-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';
</script>

<svelte:head><title>Tickets · Gestión</title></svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="font-display text-3xl font-bold">Tickets</h1>
		<!-- Lo listado con los filtros aplicados, todas las páginas (HU-T07). -->
		<a
			href="{resolve('/gestion/tickets.csv')}{q({})}"
			download
			class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken"
			><Download size={20} aria-hidden="true" />Exportar CSV</a
		>
	</div>

	{#if data.antiguos.cantidad > 0}
		<!-- La purga (HU-G05) no borra los pendientes: se resuelven antes. -->
		<Aviso tipo="atencion">
			{data.antiguos.cantidad === 1
				? 'Hay 1 ticket pendiente'
				: `Hay ${data.antiguos.cantidad} tickets pendientes`} con más de 18 meses. Los tickets se borran
			a los 18 meses, pero los pendientes no: resuélvelos.
			<a
				href="{lista}{q({
					...FILTROS_INICIALES,
					estados: ['pendiente_autorizar', 'pendiente_pago'],
					hasta: data.antiguos.hasta
				})}"
				class="underline">Verlos</a
			>
		</Aviso>
	{/if}

	<!--
		Filtro rápido de estado. Cada casilla cuenta lo que hay en su estado con los demás filtros, así
		que no cambian al pulsarlas; «Todos» suma los cinco.
	-->
	<nav aria-label="Filtrar por estado" class="-mx-4 overflow-x-auto px-4">
		<ul class="flex gap-2 lg:grid lg:grid-cols-6">
			{#each [...data.porEstado, null] as t (t?.estado ?? 'todos')}
				{@const marcada = t ? f.estados.includes(t.estado) : f.estados.length === 0}
				{@const cifras = t ?? data.todos}
				<li>
					<a
						href="{lista}{q({ estados: t ? [t.estado] : [] })}"
						aria-current={marcada ? 'true' : undefined}
						class="flex h-full min-w-36 flex-col items-start gap-1 rounded-lg border border-line bg-surface px-3 py-2 hover:bg-sunken aria-[current=true]:border-ink aria-[current=true]:ring-2 aria-[current=true]:ring-ink lg:min-w-0"
					>
						{#if t}
							<EstadoInsignia estado={t.estado} corto />
						{:else}
							<span class="px-2.5 py-0.5 text-sm font-bold">Todos</span>
						{/if}
						<span class="font-mono font-bold tabular-nums">{formatoImporte(cifras.centimos)}</span>
						<span class="text-sm text-muted"
							>{cifras.tickets} {cifras.tickets === 1 ? 'ticket' : 'tickets'}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<details open={activos > 0} class="group rounded-lg border border-line bg-surface">
		<summary
			class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-bold [&::-webkit-details-marker]:hidden"
		>
			<ChevronDown size={20} aria-hidden="true" class="transition group-open:rotate-180" />
			Filtros y orden
			{#if activos}
				<span class="rounded-full bg-ink px-2 text-sm text-on-ink">{activos}</span>
			{/if}
		</summary>
		<!-- Se rehace al cambiar la URL, para que los campos muestren siempre lo aplicado. -->
		{#key f}
			<form
				method="GET"
				action={lista}
				onsubmit={limpiar}
				data-sveltekit-keepfocus
				data-sveltekit-noscroll
				class="flex flex-col gap-4 border-t border-line p-4"
			>
				<fieldset class="flex flex-col gap-1.5">
					<legend class="mb-1.5 font-bold">Estado</legend>
					<!-- Sin ningún estado marcado, todos (sin esto, volvería al de por defecto). -->
					<input type="hidden" name="estado" value="todos" />
					<div class="flex flex-wrap gap-2">
						{#each ESTADOS_TICKET as e (e)}
							<label class={claseFicha}>
								<input
									type="checkbox"
									name="estado"
									value={e}
									checked={f.estados.includes(e)}
									class="sr-only"
								/>
								{TEXTO_ESTADO[e]}
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="flex flex-col gap-1.5">
						<label for="concepto" class="font-bold">Concepto</label>
						<select id="concepto" name="concepto" class={claseCampo}>
							<option value="">Todos</option>
							{#each data.opciones.conceptos as c (c.id)}
								<option value={String(c.id)} selected={f.concepto === c.id}
									>{c.nombre}{c.activo ? '' : ' (inactivo)'}</option
								>
							{/each}
							<option value="otro" selected={f.concepto === 'otro'}>Otro (texto libre)</option>
						</select>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="socio" class="font-bold">Socio</label>
						<select id="socio" name="socio" class={claseCampo}>
							<option value="">Todos</option>
							{#each data.opciones.socios as s (s.id)}
								<option value={s.id} selected={f.socio === s.id}
									>{s.nombre}{s.deBaja ? ' (baja)' : ''}</option
								>
							{/each}
						</select>
					</div>
					<Campo etiqueta="Compra desde" name="desde" type="date" value={f.desde ?? ''} />
					<Campo etiqueta="Compra hasta" name="hasta" type="date" value={f.hasta ?? ''} />
					<Campo
						etiqueta="Importe mínimo (€)"
						name="min"
						inputmode="decimal"
						autocomplete="off"
						value={f.min === null ? '' : centimosATexto(f.min)}
					/>
					<Campo
						etiqueta="Importe máximo (€)"
						name="max"
						inputmode="decimal"
						autocomplete="off"
						value={f.max === null ? '' : centimosATexto(f.max)}
					/>
					<div class="flex flex-col gap-1.5">
						<label for="orden" class="font-bold">Ordenar por</label>
						<select id="orden" name="orden" class={claseCampo}>
							{#each COLUMNAS as c (c.orden)}
								<option value={c.orden} selected={f.orden === c.orden}>{c.texto}</option>
							{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="dir" class="font-bold">Sentido</label>
						<select id="dir" name="dir" class={claseCampo}>
							<option value="asc" selected={f.dir === 'asc'}>Ascendente</option>
							<option value="desc" selected={f.dir === 'desc'}>Descendente</option>
						</select>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<Boton type="submit">Aplicar</Boton>
					{#if algunFiltro}
						<a href={lista} class="min-h-11 content-center px-2 font-bold underline"
							>Limpiar filtros</a
						>
					{/if}
				</div>
			</form>
		{/key}
	</details>

	{#if resultado?.aviso}
		<Aviso tipo="exito">{resultado.aviso}</Aviso>
	{:else if resultado?.error}
		<Aviso>{resultado.error}</Aviso>
	{/if}

	{#if data.filas.length === 0}
		<p class="text-muted">
			{#if activos}
				No hay tickets con estos filtros.
			{:else if !estadoCambiado(f)}
				No hay tickets pendientes de autorizar.
			{:else if f.estados.length === 0}
				Todavía no hay ningún ticket.
			{:else}
				No hay tickets en este estado.
			{/if}
		</p>
	{:else}
		{#if autorizables.length}
			<form
				id="autorizar-varios"
				method="POST"
				action={accionAutorizar}
				use:enhance={() => {
					autorizando = true;
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') marcados = [];
						autorizando = false;
					};
				}}
				class="flex flex-wrap items-center gap-3"
			>
				<span class="text-muted" aria-live="polite"
					>{seleccion.length === 1 ? '1 seleccionado' : `${seleccion.length} seleccionados`}</span
				>
				<Boton
					variante="secundario"
					onclick={() => (marcados = todos ? [] : autorizables.map(marca))}
					>{todos ? 'Desmarcar todos' : 'Marcar todos'}</Boton
				>
				<Boton type="submit" variante="secundario" disabled={seleccion.length === 0 || autorizando}
					>{seleccion.length > 1
						? `Autorizar ${seleccion.length} tickets`
						: seleccion.length === 1
							? 'Autorizar 1 ticket'
							: 'Autorizar seleccionados'}</Boton
				>
			</form>
		{/if}

		<!-- Ordenador: tabla. Las cabeceras ordenan; la fila entera abre el ticket. -->
		<div class="hidden overflow-x-auto rounded-lg border border-line bg-surface lg:block">
			<table class="w-full text-left">
				<thead class="border-b border-line text-sm text-muted">
					<tr>
						{#if autorizables.length}
							<th scope="col" class="w-0 py-2 pl-3"><span class="sr-only">Marcar</span></th>
						{/if}
						<th scope="col" class="px-3 py-2 font-bold">Nº</th>
						{#each COLUMNAS as c (c.orden)}
							<th
								scope="col"
								class="px-3 py-2 font-bold {c.derecha ? 'text-right' : ''}"
								aria-sort={f.orden === c.orden
									? f.dir === 'asc'
										? 'ascending'
										: 'descending'
									: undefined}
							>
								<a
									href="{lista}{q(ordenarPor(f, c.orden))}"
									class="inline-flex items-center gap-1 hover:text-ink {f.orden === c.orden
										? 'text-ink'
										: ''}"
								>
									{c.texto}
									{#if f.orden === c.orden}
										{@const Flecha = f.dir === 'asc' ? ArrowUp : ArrowDown}
										<Flecha size={14} aria-hidden="true" />
									{/if}
								</a>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.filas as t (t.numero)}
						<tr class="relative border-b border-line last:border-0 hover:bg-sunken">
							{#if autorizables.length}
								<td class="py-2 pl-3">
									{#if autorizables.includes(t)}
										<!-- Por encima del enlace que cubre la fila. -->
										<input
											type="checkbox"
											name="tickets"
											value={marca(t)}
											form="autorizar-varios"
											bind:group={marcados}
											aria-label="Marcar {formatoNumeroTicket(t.numero)}"
											class="relative z-10 size-5 rounded border-line"
										/>
									{/if}
								</td>
							{/if}
							<td class="px-3 py-2 font-mono whitespace-nowrap">
								<a href={detalle(t.numero)} class="after:absolute after:inset-0"
									>{formatoNumeroTicket(t.numero)}</a
								>
							</td>
							<td class="px-3 py-2"><EstadoInsignia estado={t.estado} /></td>
							<td class="px-3 py-2 font-mono whitespace-nowrap">{formatoDia(t.fechaCompra)}</td>
							<td class="px-3 py-2">
								{t.socio}{t.socioDeBaja ? ' (baja)' : ''}
								{#if t.socioId === data.yo}
									<span class="inline-flex items-center gap-0.5 text-sm font-bold text-muted"
										><Lock size={12} aria-hidden="true" />tuyo</span
									>
								{/if}
							</td>
							<td class="px-3 py-2">{nombreConcepto(t)}</td>
							<td class="px-3 py-2 text-right font-mono font-bold whitespace-nowrap tabular-nums"
								>{formatoImporte(t.importeCentimos)}</td
							>
							<td class="px-3 py-2 font-mono text-sm whitespace-nowrap text-muted"
								>{formatoFechaHora(t.creadoEn)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Móvil y tableta: tarjetas. -->
		<ul class="flex flex-col gap-2 lg:hidden" aria-label="Tickets">
			{#each data.filas as t (t.numero)}
				<li class="flex items-stretch gap-2">
					{#if autorizables.includes(t)}
						<label
							class="flex w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface"
						>
							<input
								type="checkbox"
								name="tickets"
								value={marca(t)}
								form="autorizar-varios"
								bind:group={marcados}
								aria-label="Marcar {formatoNumeroTicket(t.numero)}"
								class="size-5 rounded border-line"
							/>
						</label>
					{/if}
					<a
						href={detalle(t.numero)}
						class="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-sunken"
					>
						<span class="flex items-baseline justify-between gap-3">
							<span class="min-w-0 font-bold break-words">
								{t.socio}{t.socioDeBaja ? ' (baja)' : ''}
								{#if t.socioId === data.yo}
									<span class="inline-flex items-center gap-0.5 text-sm text-muted"
										><Lock size={12} aria-hidden="true" />tuyo</span
									>
								{/if}
							</span>
							<span class="font-mono font-bold whitespace-nowrap tabular-nums"
								>{formatoImporte(t.importeCentimos)}</span
							>
						</span>
						<span class="text-sm text-muted">
							<span class="font-mono">{formatoNumeroTicket(t.numero)}</span> · {nombreConcepto(t)} · Compra
							{formatoDia(t.fechaCompra)}
						</span>
						<span><EstadoInsignia estado={t.estado} /></span>
					</a>
				</li>
			{/each}
		</ul>

		<nav aria-label="Páginas" class="flex flex-wrap items-center justify-between gap-3 text-sm">
			<span class="text-muted">
				{data.total.tickets}
				{data.total.tickets === 1 ? 'ticket' : 'tickets'} · ordenados por {TEXTO_ORDEN[
					f.orden
				].toLowerCase()}, {f.dir === 'asc' ? 'ascendente' : 'descendente'}
			</span>
			{#if data.paginas > 1}
				<span class="flex items-center gap-2">
					{#if data.pagina > 1}
						<a
							href="{lista}{q({ pagina: data.pagina - 1 })}"
							class="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken"
							>Anterior</a
						>
					{/if}
					<span>Página {data.pagina} de {data.paginas}</span>
					{#if data.pagina < data.paginas}
						<a
							href="{lista}{q({ pagina: data.pagina + 1 })}"
							class="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-bold hover:bg-sunken"
							>Siguiente</a
						>
					{/if}
				</span>
			{/if}
		</nav>
	{/if}
</main>
