import { describe, expect, it } from 'vitest';
import {
	formatoDia,
	formatoFecha,
	formatoFechaHora,
	formatoImporte,
	formatoNumeroTicket,
	formatoTamano,
	hoyEnMadrid
} from './formato';

// Intl separa el número del símbolo con un espacio duro (U+00A0).
const nbsp = ' ';

describe('formatoImporte', () => {
	it('usa punto de miles y coma decimal', () => {
		expect(formatoImporte(123456)).toBe(`1.234,56${nbsp}€`);
	});
	it('agrupa también los miles de cuatro cifras', () => {
		expect(formatoImporte(100000)).toBe(`1.000,00${nbsp}€`);
	});
	it('muestra los céntimos', () => {
		expect(formatoImporte(5)).toBe(`0,05${nbsp}€`);
	});
});

describe('formatoFecha', () => {
	it('muestra día/mes/año en hora de Madrid', () => {
		expect(formatoFecha(new Date('2026-11-03T23:30:00Z'))).toBe('04/11/2026');
	});
});

describe('formatoNumeroTicket', () => {
	it('rellena con ceros hasta seis cifras', () => {
		expect(formatoNumeroTicket(150)).toBe('T-000150');
	});
});

describe('hoyEnMadrid', () => {
	it('usa la hora de Madrid, no la UTC', () => {
		expect(hoyEnMadrid(new Date('2026-11-05T22:59:00Z'))).toBe('2026-11-05');
		expect(hoyEnMadrid(new Date('2026-11-05T23:00:00Z'))).toBe('2026-11-06');
		expect(hoyEnMadrid(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
	});
});

describe('formatoTamano', () => {
	it.each([
		[4_404_019, '4,2 MB'],
		[1024 * 1024, '1 MB'],
		[389_120, '380 KB'],
		[100, '1 KB']
	])('%i → %s', (bytes, esperado) => {
		expect(formatoTamano(bytes)).toBe(esperado);
	});
});

describe('formatoFechaHora', () => {
	it('en hora de Madrid, invierno y verano', () => {
		expect(formatoFechaHora(new Date('2026-11-06T06:15:00Z'))).toBe('06/11/2026 07:15');
		expect(formatoFechaHora(new Date('2026-07-01T22:30:00Z'))).toBe('02/07/2026 00:30');
	});
});

describe('formatoDia', () => {
	it('da la vuelta a la fecha ISO', () => {
		expect(formatoDia('2026-11-02')).toBe('02/11/2026');
	});
});
