// Formulario de registrar un pago (HU-T05), compartido por el navegador y el servidor.
import { z } from 'zod';
import { hoyEnMadrid } from '../formato.ts';
import { METODOS_PAGO } from '../pagos.ts';
import { MAX_BYTES } from './ticket.ts';

/** Cada ticket marcado va como «número-versión»: la versión cargada, para E-04. */
export const ticketMarcado = (numero: number, version: number) => `${numero}-${version}`;

export const esquemaPago = z.object({
	socio: z.uuid(),
	tickets: z.array(z.string().regex(/^\d+-\d+$/)).min(1, 'Marca al menos un ticket.'),
	fechaPago: z.iso
		.date('Elige la fecha del pago.')
		.refine((f) => f <= hoyEnMadrid(), 'La fecha del pago no puede ser futura.'),
	metodo: z.enum(METODOS_PAGO, 'Elige cómo has pagado.'),
	justificante: z
		.instanceof(File)
		.optional()
		.refine((f) => !f || f.size <= MAX_BYTES, 'El justificante puede ocupar 10 MB como máximo.')
});

/** «123-4» → { numero: 123, version: 4 } */
export const leerMarcado = (valor: string) => {
	const [numero, version] = valor.split('-').map(Number);
	return { numero, version };
};
