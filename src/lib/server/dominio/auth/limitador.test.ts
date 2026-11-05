import { describe, expect, it } from 'vitest';
import { Limitador } from './limitador';

describe('Limitador', () => {
	it('permite hasta el máximo dentro de la ventana y bloquea después', () => {
		const l = new Limitador(3, 1000);
		expect([1, 2, 3, 4].map(() => l.intentar('ip', 0))).toEqual([true, true, true, false]);
		expect(l.intentar('otra', 0)).toBe(true);
	});

	it('vuelve a permitir cuando pasa la ventana', () => {
		const l = new Limitador(1, 1000);
		l.intentar('ip', 0);
		expect(l.intentar('ip', 999)).toBe(false);
		expect(l.intentar('ip', 1000)).toBe(true);
	});

	it('al llegar al límite de claves descarta primero las caducadas', () => {
		const l = new Limitador(5, 1000, 2);
		l.intentar('a', 0);
		l.intentar('b', 500);
		l.intentar('c', 1200); // «a» ha caducado y se descarta
		expect(l.claves).toBe(2);
		expect(l.intentar('b', 1300)).toBe(true); // «b» sigue contando
	});

	it('si todas están vigentes, descarta la más antigua', () => {
		const l = new Limitador(1, 1000, 2);
		l.intentar('a', 0);
		l.intentar('b', 0);
		l.intentar('c', 0);
		expect(l.claves).toBe(2);
		expect(l.intentar('a', 0)).toBe(true); // «a» se había descartado: empieza de cero
	});
});
