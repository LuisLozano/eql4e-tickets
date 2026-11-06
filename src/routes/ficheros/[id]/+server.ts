import { error } from '@sveltejs/kit';
import { ficheroVisible } from '#lib/server/dominio/ticket/consultas.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un fichero de ticket (ADR-0002, RNF-13). Nunca se sirven como estáticos: siempre pasan por aquí. */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Sin permiso, «no encontrado», igual que si no existiera (R-01).
	if (!locals.usuario || !UUID.test(params.id)) error(404, 'No encontrado');
	const f = await ficheroVisible(db, locals.usuario, params.id);
	if (!f) error(404, 'No encontrado');

	const datos = await almacen.leer(f.ruta);
	// Las fotos se guardan como WebP: el nombre lleva la extensión real, por si se descarga.
	const nombre =
		f.tipoMime === 'image/webp'
			? f.nombreOriginal.replace(/(\.[^.]*)?$/, '.webp')
			: f.nombreOriginal;
	return new Response(new Uint8Array(datos), {
		headers: {
			'content-type': f.tipoMime,
			'content-length': String(datos.length),
			'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
			'x-content-type-options': 'nosniff',
			'cache-control': 'private, no-store'
		}
	});
};
