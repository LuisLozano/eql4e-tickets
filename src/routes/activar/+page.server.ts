import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaActivar } from '#lib/esquemas/acceso.ts';
import { activarCuenta } from '#lib/server/dominio/auth/acceso.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { limitadorActivar } from '#lib/server/web/limitadores.ts';
import { ponerCookieSesion } from '#lib/server/web/sesion.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const form = await superValidate(zod4(esquemaActivar));
	// El enlace del correo trae el código ya rellenado (HU-A01).
	form.data.codigo = url.searchParams.get('codigo') ?? '';
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await superValidate(request, zod4(esquemaActivar));
		const { contrasena } = form.data;
		form.data.contrasena = '';
		form.data.repetir = '';
		if (!form.valid) return fail(400, { form });

		if (!limitadorActivar.intentar(getClientAddress(), Date.now())) {
			return message(form, 'Demasiados intentos desde esta conexión. Espera unos minutos.', {
				status: 429
			});
		}

		const resultado = await activarCuenta(
			db,
			{ telefono: form.data.telefono, codigo: form.data.codigo, contrasena, iban: form.data.iban },
			new Date()
		);
		if (!resultado.ok) {
			if (resultado.motivo === 'contrasena') return setError(form, 'contrasena', resultado.mensaje);
			if (resultado.motivo === 'iban') return setError(form, 'iban', 'El IBAN no es válido.');
			return message(
				form,
				'Código no válido. Comprueba el teléfono o pide una invitación nueva a un tesorero.',
				{ status: 400 }
			);
		}

		ponerCookieSesion(cookies, resultado.token, resultado.caducaEn);
		// Un socio llega a «Mis tickets» con la bienvenida; un tesorero, a su inicio.
		redirect(303, resultado.esTesorero ? '/' : '/tickets?bienvenida');
	}
};
