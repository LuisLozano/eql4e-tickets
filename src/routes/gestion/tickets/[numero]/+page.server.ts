import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaAccion, esquemaMotivo } from '#lib/esquemas/revision.ts';
import { detalleParaRevisar } from '#lib/server/dominio/ticket/consultas.ts';
import { accionesPosibles } from '#lib/server/dominio/ticket/estados.ts';
import { cambiarEstado, type ResultadoCambio } from '#lib/server/dominio/ticket/servicio.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).

function numeroDe(params: { numero: string }) {
	const numero = Number(params.numero);
	if (!Number.isSafeInteger(numero) || numero <= 0) error(404, 'No encontrado');
	return numero;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const ticket = await detalleParaRevisar(db, numeroDe(params));
	if (!ticket) error(404, 'No encontrado');
	const actor = locals.usuario!;
	return {
		ticket,
		yo: actor.id,
		propio: ticket.socioId === actor.id,
		acciones: accionesPosibles(actor, ticket).filter((a) => a === 'autorizar' || a === 'rechazar'),
		rechazar: await superValidate({ version: ticket.version }, zod4(esquemaMotivo), {
			id: 'rechazar',
			errors: false
		})
	};
};

const MENSAJE: Record<Extract<ResultadoCambio, { ok: false }>['motivo'], string> = {
	modificado: 'Otro tesorero ya lo ha modificado. Revisa cómo está ahora antes de seguir.',
	propio: 'Es tu ticket: lo tiene que revisar otro tesorero.',
	estado: 'Este ticket ya no está pendiente de autorizar.',
	motivo: 'Explica el motivo del rechazo.',
	no_encontrado: 'No encontrado',
	permiso: 'No encontrado'
};

function actor({ locals }: RequestEvent) {
	if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
	return locals.usuario;
}

export const actions: Actions = {
	autorizar: async (evento) => {
		const yo = actor(evento);
		const form = await superValidate(evento.request, zod4(esquemaAccion));
		if (!form.valid) error(400, 'Petición no válida');
		const r = await cambiarEstado(
			db,
			yo,
			numeroDe(evento.params),
			'autorizar',
			form.data,
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado' || r.motivo === 'permiso') error(404, 'No encontrado');
			return fail(409, { error: MENSAJE[r.motivo] });
		}
		return { aviso: 'Ticket autorizado. Queda pendiente de pago.' };
	},

	rechazar: async (evento) => {
		const yo = actor(evento);
		const form = await superValidate(evento.request, zod4(esquemaMotivo), { id: 'rechazar' });
		if (!form.valid) return fail(400, { form });
		const r = await cambiarEstado(
			db,
			yo,
			numeroDe(evento.params),
			'rechazar',
			form.data,
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado' || r.motivo === 'permiso') error(404, 'No encontrado');
			if (r.motivo === 'motivo') return setError(form, 'motivo', MENSAJE.motivo);
			return fail(409, { form, error: MENSAJE[r.motivo] });
		}
		return { form, aviso: 'Ticket rechazado. El socio verá el motivo.' };
	}
};
