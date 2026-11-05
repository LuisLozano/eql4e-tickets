<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const enlaces = $derived(
		data.usuario
			? [
					...(data.usuario.esTesorero
						? [
								{ href: resolve('/gestion/tickets'), texto: 'Tickets' },
								{ href: resolve('/gestion/usuarios'), texto: 'Usuarios' },
								{ href: resolve('/gestion/conceptos'), texto: 'Conceptos' }
							]
						: []),
					...(data.usuario.esSocio ? [{ href: resolve('/tickets'), texto: 'Mis tickets' }] : [])
				]
			: []
	);
	const activo = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

{#if data.usuario}
	<header class="border-b border-line bg-surface">
		<div
			class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap"
		>
			<a href={resolve('/')} class="flex items-center gap-2 font-display text-lg font-bold">
				<img src="/logo.png" alt="" width="32" height="32" class="dark:invert" />
				Tickets
			</a>
			<nav aria-label="Principal" class="order-last w-full sm:order-none sm:w-auto">
				<ul class="flex gap-1 overflow-x-auto">
					{#each enlaces as enlace (enlace.href)}
						<li>
							<a
								href={enlace.href}
								aria-current={activo(enlace.href) ? 'page' : undefined}
								class="block rounded-lg px-3 py-2 whitespace-nowrap hover:bg-sunken aria-[current=page]:bg-ink aria-[current=page]:text-on-ink"
								>{enlace.texto}</a
							>
						</li>
					{/each}
				</ul>
			</nav>
			<div class="ml-auto flex items-center gap-2">
				<a
					href={resolve('/cuenta')}
					class="rounded-lg px-3 py-2 hover:bg-sunken"
					aria-current={activo(resolve('/cuenta')) ? 'page' : undefined}>{data.usuario.nombre}</a
				>
				<form method="POST" action="/salir">
					<button
						type="submit"
						class="rounded-lg border border-line px-3 py-2 font-bold hover:bg-sunken">Salir</button
					>
				</form>
			</div>
		</div>
	</header>
{/if}

{@render children()}
