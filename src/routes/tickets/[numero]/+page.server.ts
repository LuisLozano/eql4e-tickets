import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaAccion } from '#lib/esquemas/revision.ts';
import { detalleTicket } from '#lib/server/dominio/ticket/consultas.ts';
import { accionesPosibles } from '#lib/server/dominio/ticket/estados.ts';
import { cambiarEstado } from '#lib/server/dominio/ticket/servicio.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

// Ajeno, inexistente o mal escrito: siempre «no encontrado» (R-01).
function numeroDe(params: { numero: string }) {
	const numero = Number(params.numero);
	if (!Number.isSafeInteger(numero) || numero <= 0) error(404, 'No encontrado');
	return numero;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const actor = locals.usuario!;
	const ticket = await detalleTicket(db, actor.id, numeroDe(params));
	if (!ticket) error(404, 'No encontrado');
	return {
		ticket,
		yo: actor.id,
		acciones: accionesPosibles(actor, ticket)
	};
};

export const actions: Actions = {
	// HU-S05: pendiente de autorizar o rechazado pasa a anulado, y ya no se puede tocar.
	anular: async ({ request, params, locals }) => {
		const form = await superValidate(request, zod4(esquemaAccion));
		if (!form.valid) error(400, 'Petición no válida');
		const r = await cambiarEstado(
			db,
			locals.usuario!,
			numeroDe(params),
			'anular',
			form.data,
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado' || r.motivo === 'permiso') error(404, 'No encontrado');
			// Un tesorero lo ha revisado (o deshecho algo) desde que se cargó la página (E-04).
			return fail(409, {
				error: 'El ticket ha cambiado mientras lo mirabas. Revisa cómo está ahora.'
			});
		}
		return { aviso: 'Ticket anulado.' };
	}
};
