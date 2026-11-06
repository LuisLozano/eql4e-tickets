import { leerFiltros } from '#lib/listado-tickets.ts';
import { listadoGlobal, opcionesListado } from '#lib/server/dominio/ticket/listado.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).
export const load: PageServerLoad = async ({ url, locals }) => {
	const filtros = leerFiltros(url.searchParams);
	const [listado, opciones] = await Promise.all([listadoGlobal(db, filtros), opcionesListado(db)]);
	return {
		...listado,
		opciones,
		filtros: { ...filtros, pagina: listado.pagina },
		yo: locals.usuario!.id
	};
};
