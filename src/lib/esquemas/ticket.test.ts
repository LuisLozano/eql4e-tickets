import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { esquemaTicket, MAX_BYTES } from './ticket.ts';

const foto = (bytes = 10) =>
	new File([new Uint8Array(bytes)], 'ticket.jpg', { type: 'image/jpeg' });
const vacio = () => new File([], '');

const valido = {
	importe: '23,45',
	fechaCompra: '2026-11-02',
	concepto: '1',
	conceptoOtro: '',
	observaciones: '',
	ficheros: [foto()]
};

const mensajes = (datos: object) =>
	esquemaTicket.safeParse({ ...valido, ...datos }).error?.issues.map((i) => i.message) ?? [];

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('esquemaTicket', () => {
	it('acepta un ticket válido', () => {
		expect(mensajes({})).toEqual([]);
		expect(
			mensajes({ fechaCompra: '2026-11-05', concepto: 'otro', conceptoOtro: 'Floristería' })
		).toEqual([]);
	});

	it.each([
		[{ importe: '' }, 'Escribe el importe.'],
		[
			{ importe: '0' },
			'Escribe un importe mayor que 0 y con 2 decimales como máximo, por ejemplo 23,45.'
		],
		[{ fechaCompra: '' }, 'Elige la fecha de compra.'],
		[{ fechaCompra: '2026-11-06' }, 'La fecha de compra no puede ser futura.'],
		[{ concepto: '' }, 'Elige un concepto.'],
		[{ concepto: 'x1' }, 'Elige un concepto.'],
		[{ concepto: 'otro' }, 'Describe el concepto en pocas palabras.'],
		[{ concepto: 'otro', conceptoOtro: '   ' }, 'Describe el concepto en pocas palabras.'],
		[{ conceptoOtro: 'x'.repeat(101) }, 'Máximo 100 caracteres.'],
		[{ observaciones: 'x'.repeat(501) }, 'Máximo 500 caracteres.'],
		[{ ficheros: [] }, 'Añade al menos una foto o un PDF del ticket.'],
		[{ ficheros: [vacio()] }, 'Añade al menos una foto o un PDF del ticket.'],
		[
			{ ficheros: Array.from({ length: 6 }, () => foto()) },
			'Puedes añadir 5 ficheros como máximo.'
		],
		[{ ficheros: [foto(MAX_BYTES + 1)] }, 'Cada fichero puede ocupar 10 MB como máximo.']
	])('rechaza %o', (datos, mensaje) => {
		expect(mensajes(datos)).toContain(mensaje);
	});

	it('no cuenta el fichero vacío que envía un campo sin rellenar', () => {
		expect(mensajes({ ficheros: [vacio(), foto(), foto(), foto(), foto(), foto()] })).toEqual([]);
		expect(mensajes({ ficheros: [undefined, foto()] })).toEqual([]);
	});
});
