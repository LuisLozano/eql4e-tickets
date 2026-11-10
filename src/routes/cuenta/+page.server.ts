import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { esquemaCambiarContrasena } from '#lib/esquemas/acceso.ts';
import { esquemaIban } from '#lib/esquemas/usuario.ts';
import { formatoIban, normalizarIban } from '#lib/iban.ts';
import { cambiarContrasena } from '#lib/server/dominio/auth/acceso.ts';
import { cambiarIban, ibanDe } from '#lib/server/dominio/usuario/iban.ts';
import { db } from '#lib/server/infra/db/app.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const usuario = locals.usuario!;
	// El IBAN solo lo tienen los socios: es donde reciben los pagos (HU-S07).
	const iban = usuario.esSocio ? await ibanDe(db, usuario.id) : null;
	return {
		form: await superValidate(zod4(esquemaCambiarContrasena)),
		formIban: usuario.esSocio
			? await superValidate({ iban: iban ? formatoIban(iban) : '' }, zod4(esquemaIban), {
					id: 'iban',
					errors: false
				})
			: null
	};
};

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
	},

	cambiarIban: async ({ request, locals }) => {
		if (!locals.usuario?.esSocio) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaIban), { id: 'iban' });
		if (!form.valid) return fail(400, { form });
		const r = await cambiarIban(db, locals.usuario, locals.usuario.id, form.data.iban);
		if (!r.ok) return setError(form, 'iban', 'El IBAN no es válido.');
		// Ya validado: se devuelve como queda guardado, en grupos de 4.
		const iban = normalizarIban(form.data.iban);
		form.data.iban = iban ? formatoIban(iban) : '';
		return message(form, iban ? 'IBAN guardado.' : 'IBAN borrado.');
	}
};
