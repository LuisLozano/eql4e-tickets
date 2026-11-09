// Refresco automático de las listas y los detalles: el socio ve el cambio de estado de sus tickets
// sin recargar a mano. En el móvil la página se queda dormida al cambiar de tarea; al volver a ella
// se recargan los datos (no la página). Mientras se ve, también cada pocos minutos.

import { invalidateAll } from '$app/navigation';

export const INTERVALO_MS = 2 * 60_000;

const TEXTO = 'textarea, input:not([type=hidden], [type=checkbox], [type=radio], [type=file])';

/** Hay algo a medio escribir (un motivo de rechazo, por ejemplo): no se refresca. */
function escribiendo() {
	if (document.activeElement?.matches(TEXTO)) return true;
	return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXTO)].some(
		(c) => c.value !== c.defaultValue
	);
}

/** Se llama al iniciar el componente de la página. */
export function refrescoAutomatico() {
	$effect(() => {
		const refrescar = () => {
			if (document.visibilityState === 'visible' && !escribiendo()) invalidateAll();
		};
		const reloj = setInterval(refrescar, INTERVALO_MS);
		document.addEventListener('visibilitychange', refrescar);
		return () => {
			clearInterval(reloj);
			document.removeEventListener('visibilitychange', refrescar);
		};
	});
}
