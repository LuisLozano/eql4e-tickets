import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { conContenido, esquemaTicket } from '#lib/esquemas/ticket.ts';
import { hoyEnMadrid } from '#lib/formato.ts';
import {
	conceptosActivos,
	crearTicket,
	datosDeFormulario
} from '#lib/server/dominio/ticket/crear.ts';
import { almacen } from '#lib/server/infra/almacenamiento/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { prepararSubidos } from '#lib/server/infra/ficheros.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.usuario?.esSocio) error(404, 'No encontrado');
	return {
		conceptos: await conceptosActivos(db),
		hoy: hoyEnMadrid(),
		form: await superValidate({ fechaCompra: hoyEnMadrid() }, zod4(esquemaTicket), {
			errors: false
		})
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.usuario?.esSocio) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaTicket));
		if (!form.valid) return fail(400, withFiles({ form }));

		const subidos = conContenido(form.data.ficheros);
		// Los ficheros no se devuelven al navegador: si algo falla, el socio vuelve a elegirlos.
		form.data.ficheros = [];

		const preparados = await prepararSubidos(subidos);
		if (!preparados.ok) return setError(form, 'ficheros._errors', preparados.error);

		const r = await crearTicket(
			db,
			almacen,
			locals.usuario.id,
			datosDeFormulario(form.data),
			preparados.ficheros,
			new Date()
		);
		if (!r.ok) {
			return setError(form, 'concepto', 'Ese concepto ya no está disponible. Elige otro.');
		}
		redirect(303, `/tickets?enviado=${r.numero}`);
	}
};
