import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import {
	DESHACER_EN_TICKET,
	esquemaAccion,
	esquemaDeshacer,
	esquemaMotivo
} from '#lib/esquemas/revision.ts';
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
	const posibles = accionesPosibles(actor, ticket);
	// Como mucho una: deshacer la autorización (pendiente de pago) o el rechazo (rechazado).
	const deshacer = DESHACER_EN_TICKET.find((a) => posibles.includes(a)) ?? null;
	return {
		ticket,
		yo: actor.id,
		propio: ticket.socioId === actor.id,
		acciones: posibles.filter((a) => a === 'autorizar' || a === 'rechazar'),
		deshacer,
		rechazar: await superValidate({ version: ticket.version }, zod4(esquemaMotivo), {
			id: 'rechazar',
			errors: false
		}),
		formDeshacer: await superValidate(
			{ version: ticket.version, accion: deshacer ?? undefined },
			zod4(esquemaDeshacer),
			{ id: 'deshacer', errors: false }
		)
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
	},

	deshacer: async (evento) => {
		const yo = actor(evento);
		const form = await superValidate(evento.request, zod4(esquemaDeshacer), { id: 'deshacer' });
		if (!form.valid) return fail(400, { form });
		const r = await cambiarEstado(
			db,
			yo,
			numeroDe(evento.params),
			form.data.accion,
			form.data,
			new Date()
		);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado' || r.motivo === 'permiso') error(404, 'No encontrado');
			if (r.motivo === 'motivo') return setError(form, 'motivo', 'Explica por qué lo deshaces.');
			return fail(409, {
				form,
				error:
					r.motivo === 'propio'
						? 'Es tu ticket: no puedes deshacer sus pasos.'
						: 'El ticket ha cambiado: ese paso ya no se puede deshacer. Revisa cómo está ahora.'
			});
		}
		return {
			form,
			aviso:
				form.data.accion === 'deshacer_autorizacion'
					? 'Autorización deshecha. Vuelve a estar pendiente de autorizar.'
					: 'Rechazo deshecho. Vuelve a estar pendiente de autorizar.'
		};
	}
};
