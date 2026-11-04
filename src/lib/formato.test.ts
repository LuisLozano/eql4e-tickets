import { describe, expect, it } from 'vitest';
import { formatoFecha, formatoImporte, formatoNumeroTicket } from './formato';

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
