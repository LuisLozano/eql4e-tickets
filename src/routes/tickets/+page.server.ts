import { esFiltro, misTickets, totalesSocio } from '#lib/server/dominio/ticket/consultas.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// El layout ya exige sesión; quien solo es tesorero no tiene tickets propios.
	const socioId = locals.usuario!.id;
	const pedido = url.searchParams.get('estado');
	const filtro = esFiltro(pedido) ? pedido : undefined;
	const anio = Number(hoyEnMadrid().slice(0, 4));
	const [tickets, totales] = await Promise.all([
		misTickets(db, socioId, filtro),
		totalesSocio(db, socioId, anio)
	]);
	return { tickets, totales, anio, filtro: filtro ?? null };
};
