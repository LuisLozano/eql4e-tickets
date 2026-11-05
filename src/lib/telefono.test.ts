import { describe, expect, it } from 'vitest';
import { formatoAlEscribir, formatoTelefono, normalizarTelefono, posicionTras } from './telefono';

describe('normalizarTelefono', () => {
	it.each([
		['612 345 678', '+34612345678'],
		['+34 612345678', '+34612345678'],
		['0034612345678', '+34612345678'],
		['  91 123 45 67 ', '+34911234567'],
		['+44 7911 123456', '+447911123456']
	])('%s → %s', (entrada, esperado) => {
		expect(normalizarTelefono(entrada)).toBe(esperado);
	});

	it.each(['12345', '', 'hola'])('rechaza «%s»', (entrada) => {
		expect(normalizarTelefono(entrada)).toBeNull();
	});
});

describe('formatoTelefono', () => {
	it('agrupa las cifras', () => {
		expect(formatoTelefono('+34612345678')).toBe('+34 612 345 678');
	});
	it('otros países, en formato internacional', () => {
		expect(formatoTelefono('+447911123456')).toBe('+44 7911 123456');
	});
	it('deja tal cual lo que no entiende', () => {
		expect(formatoTelefono('x')).toBe('x');
	});
});

describe('formatoAlEscribir', () => {
	it.each([
		['', ''],
		['6', '6'],
		['6000', '600 0'],
		['600000000', '600 000 000'],
		['600 00 00 00', '600 000 000'],
		['600-000-000', '600 000 000'],
		['+', '+'],
		['+3', '+3'],
		['+34', '+34'],
		['+34600000000', '+34 600 000 000'],
		['003', '003'],
		['0034600000000', '+34 600 000 000']
	])('«%s» → «%s»', (entrada, esperado) => {
		expect(formatoAlEscribir(entrada)).toBe(esperado);
	});

	it.each(['+44 7911 123456', '0044 7911', '6000000001'])('deja «%s» como está', (entrada) => {
		expect(formatoAlEscribir(entrada)).toBe(entrada);
	});
});

describe('posicionTras', () => {
	it('salta los espacios', () => {
		expect(posicionTras('600 000 000', 3)).toBe(3);
		expect(posicionTras('600 000 000', 4)).toBe(5);
		expect(posicionTras('+34 600', 3)).toBe(3);
		expect(posicionTras('+34 600', 4)).toBe(5);
	});
	it('al final si hay menos caracteres', () => {
		expect(posicionTras('600', 0)).toBe(0);
		expect(posicionTras('600', 9)).toBe(3);
	});
});
