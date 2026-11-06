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

/** Deshacer una autorización o un rechazo (HU-T06, D1 y D2), siempre con motivo. */
export const DESHACER_EN_TICKET = ['deshacer_autorizacion', 'deshacer_rechazo'] as const;

export const esquemaDeshacer = esquemaMotivo.extend({ accion: z.enum(DESHACER_EN_TICKET) });

/** Deshacer un pago (HU-T06, D3): sobre el Pago completo, con motivo. */
export const esquemaDeshacerPago = esquemaMotivo.omit({ version: true });
