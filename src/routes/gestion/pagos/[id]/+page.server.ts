import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaDeshacerPago } from '#lib/esquemas/revision.ts';
import { detallePago } from '#lib/server/dominio/pago/consultas.ts';
import { deshacerPago } from '#lib/server/dominio/pago/deshacer.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params, locals }) => {
	const pago = UUID.test(params.id) ? await detallePago(db, params.id) : null;
	if (!pago) error(404, 'No encontrado');
	return {
		pago,
		// R-04: un pago al propio tesorero lo tiene que deshacer otro.
		propio: pago.socioId === locals.usuario!.id,
		form: await superValidate(zod4(esquemaDeshacerPago), { errors: false })
	};
};

export const actions: Actions = {
	deshacer: async ({ request, params, locals }) => {
		if (!UUID.test(params.id)) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaDeshacerPago));
		if (!form.valid) return fail(400, { form });
		const r = await deshacerPago(db, locals.usuario!, params.id, form.data.motivo, new Date());
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			if (r.motivo === 'motivo') return setError(form, 'motivo', 'Explica por qué lo deshaces.');
			return message(
				form,
				r.motivo === 'propio'
					? 'Es un pago a ti: lo tiene que deshacer otro tesorero.'
					: 'Otro tesorero ya ha deshecho este pago.',
				{ status: 409 }
			);
		}
		return {
			form,
			aviso: `Pago deshecho. ${r.tickets === 1 ? 'El ticket vuelve' : `Los ${r.tickets} tickets vuelven`} a Pendiente de pago.`
		};
	}
};
