import { hoyEnMadrid } from '#lib/formato.ts';
import { leerFiltros } from '#lib/listado-tickets.ts';
import { exportarListado } from '#lib/server/dominio/ticket/listado.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { csvTickets } from '#lib/server/web/csv.ts';
import type { RequestHandler } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).
// Los mismos parámetros que /gestion/tickets: se exporta lo listado, sin paginar (HU-T07).
export const GET: RequestHandler = async ({ url }) => {
	const filas = await exportarListado(db, leerFiltros(url.searchParams));
	return new Response(csvTickets(filas), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="tickets-${hoyEnMadrid()}.csv"`,
			'cache-control': 'no-store'
		}
	});
};
