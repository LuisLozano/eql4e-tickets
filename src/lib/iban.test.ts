import { describe, expect, it } from 'vitest';
import { formatoIban, normalizarIban } from './iban';

describe('normalizarIban', () => {
	it.each([
		['ES91 2100 0418 4502 0005 1332', 'ES9121000418450200051332'],
		['es9121000418450200051332', 'ES9121000418450200051332'],
		[' ES91-2100-0418-4502-0005-1332 ', 'ES9121000418450200051332'],
		['DE89 3704 0044 0532 0130 00', 'DE89370400440532013000'],
		['GB82 WEST 1234 5698 7654 32', 'GB82WEST12345698765432']
	])('%s → %s', (entrada, esperado) => {
		expect(normalizarIban(entrada)).toBe(esperado);
	});

	it.each([
		['', 'vacío'],
		['ES91 2100 0418 4502 0005 1333', 'dígitos de control'],
		['ES91 2100 0418 4502 0005 133', 'longitud'],
		['US12 3456 7890 1234', 'país fuera de SEPA'],
		['ES9I 2100 0418 4502 0005 1332', 'letras en el control'],
		['ES91 2100 0418 4502 0005 13.2', 'caracteres raros']
	])('rechaza «%s» (%s)', (entrada) => {
		expect(normalizarIban(entrada)).toBeNull();
	});
});

describe('formatoIban', () => {
	it('agrupa de 4 en 4', () => {
		expect(formatoIban('ES9121000418450200051332')).toBe('ES91 2100 0418 4502 0005 1332');
		expect(formatoIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
	});
});
