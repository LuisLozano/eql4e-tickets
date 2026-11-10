<script lang="ts">
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Copiable from '#lib/componentes/Copiable.svelte';
	import { formatoFecha } from '#lib/formato.ts';
	import type { ResultadoInvitacion } from '#lib/server/web/invitacion.ts';

	// Tras el alta (HU-G01) o el reenvío (HU-G02): si se envió el correo y el enlace para copiarlo.
	let { invitacion, hecho }: { invitacion: ResultadoInvitacion; hecho: string } = $props();

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
	<Copiable
		id="enlace"
		etiqueta="Enlace de activación"
		valor={invitacion.enlace}
		boton="Copiar enlace"
	/>
	<p class="text-sm text-muted">Caduca el {caduca}. Solo se muestra ahora.</p>
</div>
