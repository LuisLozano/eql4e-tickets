import { error } from '@sveltejs/kit';
import { detalleTicket } from '#lib/server/dominio/ticket/consultas.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const numero = Number(params.numero);
	// Ajeno, inexistente o mal escrito: siempre «no encontrado» (R-01).
	const ticket =
		Number.isSafeInteger(numero) && numero > 0
			? await detalleTicket(db, locals.usuario!.id, numero)
			: null;
	if (!ticket) error(404, 'No encontrado');
	return { ticket, yo: locals.usuario!.id };
};
