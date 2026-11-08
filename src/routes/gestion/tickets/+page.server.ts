import { fail } from '@sveltejs/kit';
import { leerMarcado } from '#lib/esquemas/pago.ts';
import { formatoNumeroTicket, hoyEnMadrid } from '#lib/formato.ts';
import { leerFiltros } from '#lib/listado-tickets.ts';
import { pendientesAntiguos } from '#lib/server/dominio/purga/purga.ts';
import { listadoGlobal, opcionesListado } from '#lib/server/dominio/ticket/listado.ts';
import { autorizarVarios } from '#lib/server/dominio/ticket/servicio.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
	/** Autorización múltiple (HU-T03): cada casilla lleva «número-versión» (E-04). */
	autorizar: async ({ request, locals }) => {
		const marcados = (await request.formData())
			.getAll('tickets')
			.filter((v): v is string => typeof v === 'string' && /^\d+-\d+$/.test(v))
			.map(leerMarcado);
		if (marcados.length === 0) return fail(400, { error: 'Marca al menos un ticket.' });

		const r = await autorizarVarios(db, locals.usuario!, marcados, new Date());
		if (!r.ok) {
			const numero = formatoNumeroTicket(r.numero);
			return fail(409, {
				error:
					r.motivo === 'propio'
						? `El ${numero} es tuyo: lo tiene que autorizar otro tesorero. No se ha autorizado ninguno.`
						: `El ${numero} ha cambiado mientras lo mirabas (puede que otro tesorero ya lo haya revisado). No se ha autorizado ninguno: revisa la lista.`
			});
		}
		return {
			aviso:
				r.autorizados === 1
					? '1 ticket autorizado. Queda pendiente de pago.'
					: `${r.autorizados} tickets autorizados. Quedan pendientes de pago.`
		};
	}
};
