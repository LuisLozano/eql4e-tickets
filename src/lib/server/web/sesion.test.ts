import { describe, expect, it } from 'vitest';
import { rutaDeVuelta } from './sesion';

describe('rutaDeVuelta', () => {
	it.each([
		['/tickets', '/tickets'],
		['/tickets?estado=pagado', '/tickets?estado=pagado'],
		[null, '/'],
		['https://malo.example', '/'],
		['//malo.example', '/'],
		['/\\malo.example', '/']
	])('%s → %s', (entrada, esperado) => {
		expect(rutaDeVuelta(entrada)).toBe(esperado);
	});
});
