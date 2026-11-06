<script lang="ts">
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Boton from '#lib/componentes/Boton.svelte';
	import { formatoFecha } from '#lib/formato.ts';
	import type { ResultadoInvitacion } from '#lib/server/web/invitacion.ts';

	// Tras el alta (HU-G01) o el reenvío (HU-G02): si se envió el correo y el enlace para copiarlo.
	let { invitacion, hecho }: { invitacion: ResultadoInvitacion; hecho: string } = $props();

	let copiado = $state(false);
	let campo = $state<HTMLInputElement>();
	// Un enlace nuevo vuelve a mostrar «Copiar enlace».
	$effect(() => {
		void invitacion.enlace;
		copiado = false;
	});

	async function copiar() {
		try {
			await navigator.clipboard.writeText(invitacion.enlace);
			copiado = true;
		} catch {
			// Sin permiso de portapapeles: se deja seleccionado para copiarlo a mano.
			campo?.select();
		}
	}

	const caduca = $derived(formatoFecha(new Date(invitacion.caducaEn)));
</script>

{#if invitacion.envio === 'enviado'}
	<Aviso tipo="exito">Invitación enviada a {invitacion.email}. Caduca el {caduca}.</Aviso>
{:else if invitacion.envio === 'desactivado'}
	<Aviso tipo="atencion">
		{hecho}. El envío de correos está desactivado: copia el enlace y envíaselo a {invitacion.email}
		por otro medio.
	</Aviso>
{:else}
	<Aviso tipo="atencion">
		{hecho}, pero no se pudo enviar el correo a {invitacion.email}. Copia el enlace y envíaselo por
		otro medio.
	</Aviso>
{/if}
<div class="flex flex-col gap-1.5">
	<label for="enlace" class="font-bold">Enlace de activación</label>
	<div class="flex gap-2">
		<input
			id="enlace"
			bind:this={campo}
			readonly
			value={invitacion.enlace}
			class="min-h-11 w-full min-w-0 rounded-lg border border-line bg-sunken px-3 font-mono text-sm"
		/>
		<Boton variante="secundario" onclick={copiar}>{copiado ? 'Copiado' : 'Copiar enlace'}</Boton>
	</div>
	<p class="text-sm text-muted">Caduca el {caduca}. Solo se muestra ahora.</p>
</div>
