// Tokens de sesión y códigos de acceso (ADR-0003). En la base de datos solo se guarda su SHA-256.
import { createHash, randomBytes } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** `n` caracteres base32 aleatorios: 5 bits cada uno (256 es múltiplo de 32, así que es uniforme). */
function aleatorioBase32(n: number): string {
	return Array.from(randomBytes(n), (byte) => BASE32[byte & 31]).join('');
}

/** 32 caracteres (160 bits): el valor de la cookie de sesión. */
export function generarTokenSesion(): string {
	return aleatorioBase32(32).toLowerCase();
}

/**
 * Código de invitación o restablecimiento: 28 caracteres (140 bits, RNF-14) en grupos de 4,
 * como en los bocetos (K7QF-9TXB-…). Normalmente llega rellenado desde el enlace del correo.
 */
export function generarCodigo(): string {
	return aleatorioBase32(28).match(/.{4}/g)!.join('-');
}

/** Lo que escribe el usuario («k7qf 9txb…») → la forma canónica sin separadores. */
export function normalizarCodigo(texto: string): string {
	return texto.toUpperCase().replace(/[^A-Z2-7]/g, '');
}

export function sha256(texto: string): string {
	return createHash('sha256').update(texto).digest('hex');
}
