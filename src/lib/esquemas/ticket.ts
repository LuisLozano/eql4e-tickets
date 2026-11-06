// Formulario de envío de ticket (HU-S01), compartido por el navegador y el servidor.
import { z } from 'zod';
import { hoyEnMadrid } from '../formato.ts';
import { importeACentimos } from '../importe.ts';

export const MAX_FICHEROS = 5;
export const MAX_BYTES = 10 * 1024 * 1024;
export const ACEPTA = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';
/** Valor del concepto «Otro…» en el formulario; los demás son el id del concepto. */
export const OTRO = 'otro';

/**
 * Un `<input type="file">` sin usar envía un fichero vacío, que Superforms convierte en `undefined`.
 * Solo cuentan los que tienen contenido.
 */
export const conContenido = (ficheros: (File | undefined)[]) =>
	ficheros.filter((f): f is File => f !== undefined && f.size > 0);

const campos = {
	importe: z
		.string()
		.trim()
		.min(1, 'Escribe el importe.')
		.refine(
			(t) => importeACentimos(t) !== null,
			'Escribe un importe mayor que 0 y con 2 decimales como máximo, por ejemplo 23,45.'
		),
	fechaCompra: z.iso
		.date('Elige la fecha de compra.')
		.refine((f) => f <= hoyEnMadrid(), 'La fecha de compra no puede ser futura.'),
	concepto: z
		.string()
		.min(1, 'Elige un concepto.')
		.regex(new RegExp(`^(\\d+|${OTRO})$`), 'Elige un concepto.'),
	conceptoOtro: z.string().trim().max(100, 'Máximo 100 caracteres.'),
	observaciones: z.string().trim().max(500, 'Máximo 500 caracteres.')
};

/** Los ficheros nuevos: al editar puede no haber ninguno si se conservan los que había. */
const ficherosNuevos = z
	.array(z.instanceof(File).optional())
	.refine(
		(f) => conContenido(f).length <= MAX_FICHEROS,
		`Puedes añadir ${MAX_FICHEROS} ficheros como máximo.`
	)
	.refine(
		(f) => conContenido(f).every((fichero) => fichero.size <= MAX_BYTES),
		'Cada fichero puede ocupar 10 MB como máximo.'
	);

/** Los campos de datos, comunes a enviar y editar (CamposTicket.svelte). */
export type CamposFormulario = {
	[K in keyof typeof campos]: string;
};

const conConceptoOtro = <T extends { concepto: string; conceptoOtro: string }>(d: T) =>
	d.concepto !== OTRO || d.conceptoOtro.length > 0;
const errorConceptoOtro = {
	path: ['conceptoOtro'],
	message: 'Describe el concepto en pocas palabras.'
};

export const esquemaTicket = z
	.object({
		...campos,
		ficheros: ficherosNuevos.refine(
			(f) => conContenido(f).length > 0,
			'Añade al menos una foto o un PDF del ticket.'
		)
	})
	.refine(conConceptoOtro, errorConceptoOtro);

/** Editar o corregir (HU-S04, S06): con la versión cargada (E-04) y los ficheros que se quitan. */
export const esquemaEdicion = z
	.object({
		...campos,
		version: z.coerce.number().int().positive(),
		quitar: z.array(z.uuid()),
		ficheros: ficherosNuevos
	})
	.refine(conConceptoOtro, errorConceptoOtro);
