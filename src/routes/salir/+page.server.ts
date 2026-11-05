import { redirect } from '@sveltejs/kit';
import { invalidarSesion } from '#lib/server/dominio/auth/sesiones.ts';
import { db } from '#lib/server/infra/db/app.ts';
import { quitarCookieSesion } from '#lib/server/web/sesion.ts';
import type { Actions, PageServerLoad } from './$types';

// Cerrar sesión solo por POST (03-rutas): un enlace o una imagen no pueden cerrarla.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.token) await invalidarSesion(db, locals.token);
		quitarCookieSesion(cookies);
		redirect(303, '/entrar');
	}
};
