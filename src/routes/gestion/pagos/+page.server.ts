import { porPagar, ultimosPagos } from '#lib/server/dominio/pago/consultas.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).
export const load: PageServerLoad = async ({ locals }) => {
	const [pendientes, pagos] = await Promise.all([
		porPagar(db, locals.usuario!.id),
		ultimosPagos(db)
	]);
	return { pendientes, pagos };
};
