import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { URL_PUBLICA } from '$app/env/private';
import { esquemaAlta } from '#lib/esquemas/usuario.ts';
import { darDeAlta } from '#lib/server/dominio/usuario/alta.ts';
import { mensajeInvitacion } from '#lib/server/dominio/usuario/invitacion.ts';
import { listarUsuarios } from '#lib/server/dominio/usuario/listado.ts';
import { correo } from '#lib/server/infra/correo/app.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { enlaceActivacion } from '#lib/server/web/enlaces.ts';
import type { Actions, PageServerLoad } from './$types';

/** Lo que ve el tesorero tras el alta. El enlace solo se puede mostrar ahora: se guarda su hash. */
export type ResultadoInvitacion = {
	email: string;
	caducaEn: string;
	enlace: string;
	envio: 'enviado' | 'desactivado' | 'fallido';
};

export const load: PageServerLoad = async () => ({
	usuarios: await listarUsuarios(db, new Date()),
	form: await superValidate(zod4(esquemaAlta))
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

		const enlace = enlaceActivacion(URL_PUBLICA, r.codigo);
		let envio: ResultadoInvitacion['envio'] = correo.envia ? 'enviado' : 'desactivado';
		try {
			// Síncrono (ADR-0004): si falla, el alta ya está guardada y el tesorero copia el enlace.
			await correo.enviar({
				para: r.email,
				...mensajeInvitacion({ nombre: form.data.nombre, enlace, caducaEn: r.caducaEn })
			});
		} catch (e) {
			console.error(`[correo] No se pudo enviar la invitación a ${r.email}:`, e);
			envio = 'fallido';
		}

		return message(form, {
			email: r.email,
			caducaEn: r.caducaEn.toISOString(),
			enlace,
			envio
		} satisfies ResultadoInvitacion);
	}
};
