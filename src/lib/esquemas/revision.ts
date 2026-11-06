// Formularios de las acciones sobre un ticket (HU-T03, T04 y siguientes). Todas llevan la versión
// que se cargó en pantalla (concurrencia optimista, E-04).
import { z } from 'zod';

export const MOTIVO_MINIMO = 5;
export const MOTIVO_MAXIMO = 500;

const version = z.coerce.number().int().positive();

export const esquemaAccion = z.object({ version });

export const esquemaMotivo = z.object({
	version,
	motivo: z
		.string()
		.trim()
		.min(MOTIVO_MINIMO, `Explica el motivo (al menos ${MOTIVO_MINIMO} caracteres).`)
		.max(MOTIVO_MAXIMO, `Máximo ${MOTIVO_MAXIMO} caracteres.`)
});
