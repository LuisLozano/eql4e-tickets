import { describe, expect, it } from 'vitest';
import { puedeVerTicket } from './permisos.ts';

const ticket = { socioId: 'socia' };

describe('puedeVerTicket (R-01)', () => {
	it('el socio ve los suyos', () => {
		expect(puedeVerTicket({ id: 'socia', esTesorero: false }, ticket)).toBe(true);
	});
	it('el socio no ve los de otro', () => {
		expect(puedeVerTicket({ id: 'otro', esTesorero: false }, ticket)).toBe(false);
	});
	it('el tesorero ve todos', () => {
		expect(puedeVerTicket({ id: 'tesorero', esTesorero: true }, ticket)).toBe(true);
	});
});
