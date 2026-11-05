import { describe, expect, it } from 'vitest';
import { importeACentimos } from './importe.ts';

describe('importeACentimos', () => {
	it.each([
		['23,45', 2345],
		['23.45', 2345],
		['23,4', 2340],
		['23', 2300],
		[' 23,45 € ', 2345],
		['0,01', 1],
		['1.234,56', 123456],
		['1.234', 123400],
		['1234.5', 123450],
		['99.999,99', 9_999_999]
	])('«%s» → %i', (entrada, esperado) => {
		expect(importeACentimos(entrada)).toBe(esperado);
	});

	it.each(['', '0', '0,00', '-5', '23,456', '1,2,3', 'abc', '100.000,00', '12.34.56'])(
		'rechaza «%s»',
		(entrada) => {
			expect(importeACentimos(entrada)).toBeNull();
		}
	);
});
