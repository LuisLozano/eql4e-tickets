// La cookie de sesión (ADR-0003). Capa SvelteKit: el dominio no sabe nada de cookies.
import type { Cookies } from '@sveltejs/kit';

export const COOKIE_SESION = 'sesion';

export function ponerCookieSesion(cookies: Cookies, token: string, caducaEn: Date) {
	// SvelteKit pone Secure salvo en http://localhost (desarrollo y pruebas e2e).
	cookies.set(COOKIE_SESION, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: caducaEn
	});
}

export function quitarCookieSesion(cookies: Cookies) {
	cookies.delete(COOKIE_SESION, { path: '/' });
}

/** Solo se vuelve a rutas internas: evita redirecciones abiertas con `?volver=//otro-sitio`. */
export function rutaDeVuelta(valor: string | null, porDefecto = '/'): string {
	return valor && valor.startsWith('/') && !valor.startsWith('//') && !valor.startsWith('/\\')
		? valor
		: porDefecto;
}
