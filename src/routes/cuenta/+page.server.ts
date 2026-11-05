import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaCambiarContrasena } from '#lib/esquemas/acceso.ts';
import { cambiarContrasena } from '#lib/server/dominio/auth/acceso.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(esquemaCambiarContrasena))
});

export const actions: Actions = {
	cambiarContrasena: async ({ request, locals }) => {
		if (!locals.usuario || !locals.token) error(401);
		const form = await superValidate(request, zod4(esquemaCambiarContrasena));
		const { actual, nueva } = form.data;
		form.data = { actual: '', nueva: '', repetir: '' };
		if (!form.valid) return fail(400, { form });

		const resultado = await cambiarContrasena(db, {
			usuarioId: locals.usuario.id,
			actual,
			nueva,
			tokenActual: locals.token
		});
		if (!resultado.ok) {
			return resultado.motivo === 'actual'
				? setError(form, 'actual', 'La contraseña actual no es correcta.')
				: setError(form, 'nueva', resultado.mensaje);
		}
		return message(form, 'Contraseña cambiada. Se han cerrado tus sesiones en otros dispositivos.');
	}
};
