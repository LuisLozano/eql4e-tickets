import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaEntrar } from '#lib/esquemas/acceso.ts';
import { iniciarSesion } from '#lib/server/dominio/auth/acceso.ts';
import { correo } from '#lib/server/infra/correo/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { limitadorEntrar } from '#lib/server/web/limitadores.ts';
import { ponerCookieSesion, rutaDeVuelta } from '#lib/server/web/sesion.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(esquemaEntrar)),
	// Sin correo, el enlace de restablecer no llegaría: no se ofrece (HU-A04).
	correoActivo: correo.envia
});

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await superValidate(request, zod4(esquemaEntrar));
		const contrasena = form.data.contrasena;
		form.data.contrasena = ''; // nunca se devuelve al navegador
		if (!form.valid) return fail(400, { form });

		if (!limitadorEntrar.intentar(getClientAddress(), Date.now())) {
			return message(form, 'Demasiados intentos desde esta conexión. Espera unos minutos.', {
				status: 429
			});
		}

		const resultado = await iniciarSesion(
			db,
			{ telefono: form.data.telefono, contrasena },
			new Date()
		);
		if (!resultado.ok) {
			const texto =
				resultado.motivo === 'bloqueado'
					? 'Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.'
					: 'Teléfono o contraseña incorrectos.';
			return message(form, texto, { status: 400 });
		}

		ponerCookieSesion(cookies, resultado.token, resultado.caducaEn);
		redirect(303, rutaDeVuelta(url.searchParams.get('volver')));
	}
};
