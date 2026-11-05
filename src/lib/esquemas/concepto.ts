// Formularios de conceptos (HU-G04), compartidos por el navegador y el servidor.
import { z } from 'zod';

export const LARGO_MAXIMO = 50;

/** Igual que `claveNombre` en la base de datos: quita las tildes y conserva la ñ. */
export const sinTildes = (texto: string) =>
	texto.replace(
		/[áàâäéèêëíìîïóòôöúùûü]/g,
		(l) => 'aaaaeeeeiiiioooouuuu'['áàâäéèêëíìîïóòôöúùûü'.indexOf(l)]
	);

const nombre = z
	.string()
	.trim()
	.min(1, 'Escribe el nombre.')
	.max(LARGO_MAXIMO, `Máximo ${LARGO_MAXIMO} caracteres.`)
	.refine(
		(n) => sinTildes(n.toLowerCase()) !== 'otro',
		'«Otro» ya existe: es la opción para lo que no encaja en ningún concepto.'
	);

export const esquemaCrear = z.object({ nombre });

export const esquemaRenombrar = z.object({ id: z.coerce.number().int().positive(), nombre });
