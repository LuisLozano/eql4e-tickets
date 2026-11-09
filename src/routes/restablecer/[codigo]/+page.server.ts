import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaRestablecer } from '#lib/esquemas/acceso.ts';
import { restablecerContrasena } from '#lib/server/dominio/auth/acceso.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { limitadorActivar } from '#lib/server/web/limitadores.ts';
import { ponerCookieSesion } from '#lib/server/web/sesion.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(esquemaRestablecer))
});

export const actions: Actions = {
	default: async ({ request, cookies, params, getClientAddress }) => {
		const form = await superValidate(request, zod4(esquemaRestablecer));
		const { contrasena } = form.data;
		form.data.contrasena = '';
		form.data.repetir = '';
		if (!form.valid) return fail(400, { form });

		// Comparte el límite con la activación: los dos prueban códigos.
		if (!limitadorActivar.intentar(getClientAddress(), Date.now())) {
			return message(form, 'Demasiados intentos desde esta conexión. Espera unos minutos.', {
				status: 429
			});
		}

		const resultado = await restablecerContrasena(
			db,
			{ telefono: form.data.telefono, codigo: params.codigo, contrasena },
			new Date()
		);
		if (!resultado.ok) {
			if (resultado.motivo === 'contrasena') return setError(form, 'contrasena', resultado.mensaje);
			return message(
				form,
				'El enlace no vale: ha caducado, ya se usó o el teléfono no es el de la cuenta. Pide otro.',
				{ status: 400 }
			);
		}

		ponerCookieSesion(cookies, resultado.token, resultado.caducaEn);
		redirect(303, '/');
	}
};
