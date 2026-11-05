import { describe, expect, it } from 'vitest';
import {
	hashContrasena,
	problemaContrasena,
	verificarContrasena,
	verificarFicticio
} from './contrasenas';

describe('problemaContrasena', () => {
	it('exige al menos 8 caracteres', () => {
		expect(problemaContrasena('corta')).toMatch(/al menos 8/);
	});
	it.each(['12345678', 'password', 'Contraseña', 'QWERTYUIOP'])('rechaza la común «%s»', (c) => {
		expect(problemaContrasena(c)).toMatch(/demasiado común/);
	});
	it('acepta una contraseña razonable', () => {
		expect(problemaContrasena('ticket de ferretería 2026')).toBeNull();
	});
});

describe('Argon2id', () => {
	it('verifica la contraseña correcta y rechaza otra', async () => {
		const hash = await hashContrasena('una frase larga');
		expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
		expect(await verificarContrasena(hash, 'una frase larga')).toBe(true);
		expect(await verificarContrasena(hash, 'otra frase larga')).toBe(false);
	});

	it('la verificación ficticia termina sin error, también la segunda vez', async () => {
		await expect(verificarFicticio('lo que sea')).resolves.toBeUndefined();
		await expect(verificarFicticio('otra vez')).resolves.toBeUndefined();
	});
});
