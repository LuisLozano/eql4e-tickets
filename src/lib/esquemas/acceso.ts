// Formularios de acceso (HU-A01–A04). La validación del servidor es la que manda:
// la fortaleza de la contraseña se comprueba en el dominio (lista de contraseñas comunes).
import { z } from 'zod';
import { campoIban } from './usuario.ts';

const telefono = z.string().trim().min(1, 'Escribe tu teléfono.');

export const esquemaEntrar = z.object({
	telefono,
	contrasena: z.string().min(1, 'Escribe tu contraseña.')
});

const contrasenaNueva = z.string().min(8, 'Mínimo 8 caracteres.').max(200);

export const esquemaActivar = z
	.object({
		codigo: z.string().trim().min(1, 'Escribe el código de invitación.'),
		telefono,
		contrasena: contrasenaNueva,
		repetir: z.string(),
		iban: campoIban
	})
	.refine((d) => d.contrasena === d.repetir, {
		path: ['repetir'],
		message: 'Las contraseñas no coinciden.'
	});

export const esquemaCambiarContrasena = z
	.object({
		actual: z.string().min(1, 'Escribe tu contraseña actual.'),
		nueva: contrasenaNueva,
		repetir: z.string()
	})
	.refine((d) => d.nueva === d.repetir, {
		path: ['repetir'],
		message: 'Las contraseñas no coinciden.'
	});

export const esquemaSolicitarRestablecimiento = z.object({ telefono });

export const esquemaRestablecer = z
	.object({
		telefono,
		contrasena: contrasenaNueva,
		repetir: z.string()
	})
	.refine((d) => d.contrasena === d.repetir, {
		path: ['repetir'],
		message: 'Las contraseñas no coinciden.'
	});
