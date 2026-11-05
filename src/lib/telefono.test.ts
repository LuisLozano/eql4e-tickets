import { describe, expect, it } from 'vitest';
import { formatoTelefono, normalizarTelefono } from './telefono';

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
