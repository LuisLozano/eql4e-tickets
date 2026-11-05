// Compresión de fotos en el móvil antes de subirlas (HU-S01, ADR-0005). El servidor recodifica igualmente.
import Compresor from './compresor.worker.ts?worker';
import type { Peticion, Respuesta } from './compresor.worker.ts';

export const LADO_MAXIMO = 2000;
const CALIDAD = 0.82;
const HEIC = /^image\/hei[cf]$|\.hei[cf]$/i;

export type Comprimido = { ok: true; fichero: File; antes: number } | { ok: false; motivo: 'heic' };

let compresor: Worker | undefined;
let siguiente = 0;
const pendientes = new Map<number, (r: Respuesta) => void>();

function enWorker(fichero: File): Promise<Respuesta> {
	if (!compresor) {
		compresor = new Compresor();
		compresor.onmessage = ({ data }: MessageEvent<Respuesta>) => {
			pendientes.get(data.id)?.(data);
			pendientes.delete(data.id);
		};
		// Si el worker no carga, nadie se queda esperando: todo sigue sin comprimir.
		compresor.onerror = () => {
			for (const [id, resolver] of pendientes) resolver({ id, error: 'worker' });
			pendientes.clear();
			compresor = undefined;
		};
	}
	const id = ++siguiente;
	return new Promise((resolver) => {
		pendientes.set(id, resolver);
		compresor!.postMessage({ id, fichero, lado: LADO_MAXIMO, calidad: CALIDAD } satisfies Peticion);
	});
}

const esHeic = (f: File) => HEIC.test(f.type) || HEIC.test(f.name);

/**
 * Reduce una foto a JPEG con el lado mayor de 2000 px. Los PDF, y las fotos que el navegador no
 * sabe leer o que no ganan nada, se quedan como están. Un HEIC que no se puede convertir se
 * rechaza aquí, porque el servidor tampoco lo admite.
 */
export async function comprimir(fichero: File): Promise<Comprimido> {
	const antes = fichero.size;
	if (!fichero.type.startsWith('image/') && !esHeic(fichero)) return { ok: true, fichero, antes };
	if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
		return esHeic(fichero) ? { ok: false, motivo: 'heic' } : { ok: true, fichero, antes };
	}

	const r = await enWorker(fichero).catch((e): Respuesta => ({ id: 0, error: String(e) }));
	if ('error' in r)
		return esHeic(fichero) ? { ok: false, motivo: 'heic' } : { ok: true, fichero, antes };
	if (r.blob.size >= antes && !esHeic(fichero)) return { ok: true, fichero, antes };

	const nombre = fichero.name.replace(/\.[^.]*$/, '') + '.jpg';
	return { ok: true, fichero: new File([r.blob], nombre, { type: 'image/jpeg' }), antes };
}
