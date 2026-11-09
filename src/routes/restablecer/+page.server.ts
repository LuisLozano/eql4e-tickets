import { URL_PUBLICA } from '$app/env/private';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { normalizarTelefono } from '#lib/telefono.ts';
import { esquemaSolicitarRestablecimiento } from '#lib/esquemas/acceso.ts';
import { correo } from '#lib/server/infra/correo/app.ts';
import { limitadorRestablecer, limitadorRestablecerTelefono } from '#lib/server/web/limitadores.ts';
import { pedirRestablecimiento } from '#lib/server/web/restablecimiento.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(esquemaSolicitarRestablecimiento)),
	correoActivo: correo.envia
});

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await superValidate(request, zod4(esquemaSolicitarRestablecimiento));
		if (!form.valid) return fail(400, { form });

		if (!limitadorRestablecer.intentar(getClientAddress(), Date.now())) {
			return message(form, 'Demasiados intentos desde esta conexión. Espera unos minutos.', {
				status: 429
			});
		}

		// La misma respuesta exista o no el teléfono (HU-A04). Por encima del límite por teléfono
		// no se envía nada, pero tampoco se dice: diría que ese teléfono se ha usado.
		const telefono = normalizarTelefono(form.data.telefono) ?? form.data.telefono;
		if (limitadorRestablecerTelefono.intentar(telefono, Date.now())) {
			pedirRestablecimiento(URL_PUBLICA, telefono);
		}
		return message(form, 'enviado');
	}
};
