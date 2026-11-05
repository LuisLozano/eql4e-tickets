import { describe, expect, it } from 'vitest';
import { generarCodigo, generarTokenSesion, normalizarCodigo, sha256 } from './tokens';

describe('generarTokenSesion', () => {
	it('da 32 caracteres base32 en minúsculas y distintos cada vez', () => {
		const a = generarTokenSesion();
		expect(a).toMatch(/^[a-z2-7]{32}$/);
		expect(generarTokenSesion()).not.toBe(a);
	});
});

describe('generarCodigo', () => {
	it('da 7 grupos de 4 caracteres (140 bits)', () => {
		expect(generarCodigo()).toMatch(/^([A-Z2-7]{4}-){6}[A-Z2-7]{4}$/);
	});
});

describe('normalizarCodigo', () => {
	it('acepta minúsculas, espacios y guiones', () => {
		expect(normalizarCodigo(' k7qf-9txb 2m4r ')).toBe('K7QFTXB2M4R');
	});
	it('un código generado no cambia salvo por los guiones', () => {
		const codigo = generarCodigo();
		expect(normalizarCodigo(codigo)).toBe(codigo.replaceAll('-', ''));
	});
});

describe('sha256', () => {
	it('da el resumen en hexadecimal', () => {
		expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});
});
