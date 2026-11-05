// Formulario de alta de usuario (HU-G01). El dominio vuelve a normalizar y comprueba la unicidad.
import { z } from 'zod';
import { normalizarTelefono } from '#lib/telefono.ts';

export const esquemaAlta = z
	.object({
		nombre: z.string().trim().min(1, 'Escribe el nombre.').max(100, 'Máximo 100 caracteres.'),
		telefono: z
			.string()
			.trim()
			.min(1, 'Escribe el teléfono.')
			.refine((t) => normalizarTelefono(t) !== null, 'El teléfono no es válido.'),
		email: z.email('El email no es válido.').max(254),
		esSocio: z.boolean().default(true),
		esTesorero: z.boolean().default(false)
	})
	.refine((d) => d.esSocio || d.esTesorero, {
		path: ['esSocio'],
		message: 'Marca al menos un rol.'
	});
