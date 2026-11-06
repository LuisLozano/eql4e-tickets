import { error } from '@sveltejs/kit';
import { justificanteVisible } from '#lib/server/dominio/pago/consultas.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXTENSION: Record<string, string> = { 'image/webp': 'webp', 'application/pdf': 'pdf' };

/** El justificante de un pago (HU-T05): para su socio y los tesoreros; nunca como estático. */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Sin permiso, «no encontrado», igual que si no existiera (R-01).
	if (!locals.usuario || !UUID.test(params.pagoId)) error(404, 'No encontrado');
	const j = await justificanteVisible(db, locals.usuario, params.pagoId);
	if (!j) error(404, 'No encontrado');

	const datos = await almacen.leer(j.ruta);
	const nombre = `justificante-${j.fechaPago}.${EXTENSION[j.tipoMime] ?? 'bin'}`;
	return new Response(new Uint8Array(datos), {
		headers: {
			'content-type': j.tipoMime,
			'content-length': String(datos.length),
			'content-disposition': `inline; filename="${nombre}"`,
			'x-content-type-options': 'nosniff',
			'cache-control': 'private, no-store'
		}
	});
};
