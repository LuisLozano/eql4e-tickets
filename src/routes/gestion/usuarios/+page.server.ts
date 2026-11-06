import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { URL_PUBLICA } from '$app/env/private';
import { esquemaAlta, valoresIniciales } from '#lib/esquemas/usuario.ts';
import { darDeAlta } from '#lib/server/dominio/usuario/alta.ts';
import { listarUsuarios } from '#lib/server/dominio/usuario/listado.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { enviarInvitacion } from '#lib/server/web/invitacion.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	usuarios: await listarUsuarios(db, new Date()),
	form: await superValidate(valoresIniciales, zod4(esquemaAlta), { errors: false })
});

export const actions: Actions = {
	alta: async ({ request, locals }) => {
		if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
		const form = await superValidate(request, zod4(esquemaAlta));
		if (!form.valid) return fail(400, { form });

		const r = await darDeAlta(db, form.data, locals.usuario.id, new Date());
		if (!r.ok) {
			return r.campo === 'email'
				? setError(form, 'email', 'Ya hay un usuario con ese email.')
				: setError(
						form,
						'telefono',
						r.motivo === 'duplicado'
							? 'Ya hay un usuario con ese teléfono.'
							: 'El teléfono no es válido.'
					);
		}

		return message(
			form,
			await enviarInvitacion(URL_PUBLICA, { ...r, nombre: form.data.nombre.trim() })
		);
	}
};
