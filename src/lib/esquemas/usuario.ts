// Formulario de alta de usuario (HU-G01) y el IBAN (HU-S07). El dominio vuelve a normalizar y
// comprueba la unicidad.
import { z } from 'zod';
import { normalizarIban } from '#lib/iban.ts';
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
		// Sin `.default(true)`: una casilla desmarcada no se envía y Superforms pondría el valor por
		// defecto. El «Socio» marcado de inicio lo pone la página (`valoresIniciales`).
		esSocio: z.boolean(),
		esTesorero: z.boolean()
	})
	.refine((d) => d.esSocio || d.esTesorero, {
		path: ['esSocio'],
		message: 'Marca al menos un rol.'
	});

export const valoresIniciales = { esSocio: true, esTesorero: false };

/** El mismo formulario sirve para el alta y para editar la ficha (HU-G03). */
export type CamposUsuario = z.infer<typeof esquemaAlta>;

/** IBAN para los pagos (HU-S07): opcional; vacío lo borra. El dominio lo vuelve a normalizar. */
export const campoIban = z
	.string()
	.trim()
	.max(50, 'El IBAN no es válido.')
	.refine(
		(t) => t === '' || normalizarIban(t) !== null,
		'El IBAN no es válido: revisa que esté completo y bien copiado.'
	);

export const esquemaIban = z.object({ iban: campoIban });
