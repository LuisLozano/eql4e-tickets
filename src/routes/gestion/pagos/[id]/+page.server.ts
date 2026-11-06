import { error } from '@sveltejs/kit';
import { detallePago } from '#lib/server/dominio/pago/consultas.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params }) => {
	const pago = UUID.test(params.id) ? await detallePago(db, params.id) : null;
	if (!pago) error(404, 'No encontrado');
	return { pago };
};
