// See https://svelte.dev/docs/kit/types#app.d.ts
import type { UsuarioSesion } from '#lib/server/dominio/auth/sesiones.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Usuario con sesión iniciada, o nulo (hooks.server.ts). */
			usuario: UsuarioSesion | null;
			/** Token de la cookie de sesión, para cerrar las demás sesiones al cambiar la contraseña. */
			token: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
