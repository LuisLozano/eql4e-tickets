import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { URL_PUBLICA } from '$app/env/private';
import { esquemaAlta, esquemaIban } from '#lib/esquemas/usuario.ts';
import { formatoIban, normalizarIban } from '#lib/iban.ts';
import {
	darDeBaja,
	editarUsuario,
	reactivar,
	reenviarInvitacion
} from '#lib/server/dominio/usuario/gestion.ts';
import { cambiarIban, ibanDe } from '#lib/server/dominio/usuario/iban.ts';
import { fichaUsuario } from '#lib/server/dominio/usuario/listado.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { enviarInvitacion } from '#lib/server/web/invitacion.ts';
import { formatoTelefono } from '#lib/telefono.ts';
import type { Actions, PageServerLoad } from './$types';

// Solo para tesoreros: lo comprueba la guarda de hooks.server.ts (404 para el resto).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDe(params: { id: string }) {
	if (!UUID.test(params.id)) error(404, 'No encontrado');
	return params.id;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const u = await fichaUsuario(db, idDe(params), new Date());
	if (!u) error(404, 'No encontrado');
	const datos = {
		nombre: u.nombre,
		// Como lo escribiría el tesorero: sin el +34 de los españoles.
		telefono: formatoTelefono(u.telefono).replace(/^\+34 /, ''),
		email: u.email,
		esSocio: u.esSocio,
		esTesorero: u.esTesorero
	};
	// El IBAN (HU-S07), solo de los socios: se puede corregir por si lo da de palabra.
	const iban = u.esSocio ? await ibanDe(db, u.id) : null;
	return {
		usuario: u,
		yo: u.id === locals.usuario!.id,
		form: await superValidate(datos, zod4(esquemaAlta), { errors: false }),
		formIban: u.esSocio
			? await superValidate({ iban: iban ? formatoIban(iban) : '' }, zod4(esquemaIban), {
					id: 'iban',
					errors: false
				})
			: null
	};
};

function actor({ locals }: RequestEvent) {
	if (!locals.usuario?.esTesorero) error(404, 'No encontrado');
	return locals.usuario;
}

const ULTIMO_TESORERO =
	'Es el único tesorero activo: tiene que haber al menos uno. Haz tesorero antes a otra persona.';

export const actions: Actions = {
	guardar: async (evento) => {
		actor(evento);
		const form = await superValidate(evento.request, zod4(esquemaAlta));
		if (!form.valid) return fail(400, { form });
		const r = await editarUsuario(db, idDe(evento.params), form.data);
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			if (r.motivo === 'ultimo_tesorero') return setError(form, 'esTesorero', ULTIMO_TESORERO);
			if ('campo' in r && r.campo === 'email') {
				return setError(form, 'email', 'Ya hay otro usuario con ese email.');
			}
			return setError(
				form,
				'telefono',
				r.motivo === 'duplicado'
					? 'Ya hay otro usuario con ese teléfono.'
					: 'El teléfono no es válido.'
			);
		}
		return message(form, 'Cambios guardados.');
	},

	cambiarIban: async (evento) => {
		const yo = actor(evento);
		const form = await superValidate(evento.request, zod4(esquemaIban), { id: 'iban' });
		if (!form.valid) return fail(400, { form });
		const r = await cambiarIban(db, yo, idDe(evento.params), form.data.iban);
		if (!r.ok) {
			if (r.motivo !== 'invalido') error(404, 'No encontrado');
			return setError(form, 'iban', 'El IBAN no es válido.');
		}
		const iban = normalizarIban(form.data.iban);
		form.data.iban = iban ? formatoIban(iban) : '';
		return message(form, iban ? 'IBAN guardado.' : 'IBAN borrado.');
	},

	reenviar: async (evento) => {
		const yo = actor(evento);
		const r = await reenviarInvitacion(db, yo.id, idDe(evento.params), new Date());
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			return fail(409, { error: 'Está de baja: reactívalo antes de enviarle una invitación.' });
		}
		return {
			invitacion: await enviarInvitacion(URL_PUBLICA, r),
			restablecer: r.restablecer
		};
	},

	baja: async (evento) => {
		const yo = actor(evento);
		const r = await darDeBaja(db, yo.id, idDe(evento.params), new Date());
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			const textos = {
				propio: 'No puedes darte de baja a ti mismo: pídeselo a otro tesorero.',
				estado: 'Ya estaba de baja.',
				ultimo_tesorero: ULTIMO_TESORERO
			};
			return fail(409, { error: textos[r.motivo] });
		}
		return { aviso: 'Usuario dado de baja. Ya no puede entrar; sus tickets se conservan.' };
	},

	reactivar: async (evento) => {
		actor(evento);
		const r = await reactivar(db, idDe(evento.params));
		if (!r.ok) {
			if (r.motivo === 'no_encontrado') error(404, 'No encontrado');
			return fail(409, { error: 'No estaba de baja.' });
		}
		return {
			aviso:
				r.estado === 'activo'
					? 'Usuario reactivado. Puede volver a entrar con su contraseña.'
					: 'Usuario reactivado. Nunca llegó a activar su cuenta: envíale una invitación.'
		};
	}
};
