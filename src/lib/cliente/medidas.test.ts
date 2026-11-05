import { describe, expect, it } from 'vitest';
import { medidas } from './medidas.ts';

describe('medidas', () => {
	it.each([
		[4000, 3000, { ancho: 2000, alto: 1500 }],
		[3000, 4000, { ancho: 1500, alto: 2000 }],
		[1200, 800, { ancho: 1200, alto: 800 }],
		[2001, 1, { ancho: 2000, alto: 1 }]
	])('%i×%i → %o', (ancho, alto, esperado) => {
		expect(medidas(ancho, alto, 2000)).toEqual(esperado);
	});
});
