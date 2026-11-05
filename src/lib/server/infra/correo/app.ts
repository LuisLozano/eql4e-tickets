// El correo de la app, configurado con las variables de entorno. Solo lo importan rutas y hooks.
import {
	CORREO_MODO,
	SMTP_FROM,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_USER
} from '$app/env/private';
import { crearCorreo } from './cliente.ts';

export const correo = crearCorreo({
	modo: CORREO_MODO,
	host: SMTP_HOST,
	puerto: SMTP_PORT,
	usuario: SMTP_USER,
	contrasena: SMTP_PASS,
	remitente: SMTP_FROM
});
