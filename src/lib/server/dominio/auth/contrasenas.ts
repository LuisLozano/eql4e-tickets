// Contraseñas (RNF-11, ADR-0003): Argon2id con los parámetros mínimos de OWASP y
// comprobación contra las 10.000 contraseñas más comunes, sin llamadas externas.
import { hash, verify } from '@node-rs/argon2';
import comunes from '@zxcvbn-ts/language-common/dist/passwords.json.mjs';

export const LONGITUD_MINIMA = 8;

// OWASP: Argon2id, 19 MiB, 2 iteraciones, 1 hilo. El algoritmo por defecto de la librería es Argon2id.
const PARAMETROS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const CONTRASENAS_COMUNES = new Set<string>([
	...comunes.slice(0, 10_000),
	// Habituales en español que no siempre están en la lista
	'contraseña',
	'contrasena',
	'12345678a',
	'asociacion',
	'tesorero',
	'tesorera'
]);

/** Nulo si la contraseña es aceptable; si no, el motivo para mostrarlo al usuario. */
export function problemaContrasena(contrasena: string): string | null {
	if (contrasena.length < LONGITUD_MINIMA) {
		return `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`;
	}
	if (CONTRASENAS_COMUNES.has(contrasena.toLowerCase())) {
		return 'Esa contraseña es demasiado común. Elige otra.';
	}
	return null;
}

export function hashContrasena(contrasena: string): Promise<string> {
	return hash(contrasena, PARAMETROS);
}

export function verificarContrasena(hashGuardado: string, contrasena: string): Promise<boolean> {
	return verify(hashGuardado, contrasena);
}

// Hash de una contraseña aleatoria: se verifica contra él cuando el usuario no existe, para que
// la respuesta tarde lo mismo y no delate qué teléfonos están dados de alta.
let hashFicticio: Promise<string> | undefined;
export async function verificarFicticio(contrasena: string): Promise<void> {
	hashFicticio ??= hashContrasena(crypto.randomUUID());
	await verify(await hashFicticio, contrasena);
}
