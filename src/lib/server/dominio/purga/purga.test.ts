import { describe, expect, it } from 'vitest';
import { diaAnterior, fechaLimite } from './purga.ts';

describe('fechaLimite (HU-G05)', () => {
	it('18 meses antes de hoy', () => {
		expect(fechaLimite('2026-11-08')).toBe('2025-05-08');
		expect(fechaLimite('2026-06-15')).toBe('2024-12-15');
		expect(fechaLimite('2027-01-01')).toBe('2025-07-01');
	});

	it('si el mes es más corto, su último día (también en bisiesto)', () => {
		expect(fechaLimite('2026-08-31')).toBe('2025-02-28');
		expect(fechaLimite('2025-08-31')).toBe('2024-02-29');
		expect(fechaLimite('2026-12-31')).toBe('2025-06-30');
	});
});

describe('diaAnterior', () => {
	it('resta un día, cambiando de mes y de año', () => {
		expect(diaAnterior('2025-05-08')).toBe('2025-05-07');
		expect(diaAnterior('2025-03-01')).toBe('2025-02-28');
		expect(diaAnterior('2025-01-01')).toBe('2024-12-31');
	});
});
