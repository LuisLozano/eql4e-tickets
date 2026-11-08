import { hoyEnMadrid } from '#lib/formato.ts';
import { leerFiltros } from '#lib/listado-tickets.ts';
import { pendientesAntiguos } from '#lib/server/dominio/purga/purga.ts';
import { listadoGlobal, opcionesListado } from '#lib/server/dominio/ticket/listado.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).
export const load: PageServerLoad = async ({ url, locals }) => {
	const filtros = leerFiltros(url.searchParams);
	const [listado, opciones, antiguos] = await Promise.all([
		listadoGlobal(db, filtros),
		opcionesListado(db),
		pendientesAntiguos(db, hoyEnMadrid())
	]);
	return {
		...listado,
		opciones,
		antiguos,
		filtros: { ...filtros, pagina: listado.pagina },
		yo: locals.usuario!.id
	};
};
