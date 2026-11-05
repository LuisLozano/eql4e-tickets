// Teléfonos en formato E.164 (+34612345678), que es como se guardan y se comparan (HU-G01).
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** «612 345 678», «0034 612…» o «+34 612…» → «+34612345678». Nulo si no es un número válido. */
export function normalizarTelefono(texto: string): string | null {
	const numero = parsePhoneNumberFromString(texto.trim(), 'ES');
	return numero?.isValid() ? numero.number : null;
}

/** «+34612345678» → «+34 612 345 678» (guía visual); otros países, en su formato internacional. */
export function formatoTelefono(e164: string): string {
	const espanol = /^\+34(\d{3})(\d{3})(\d{3})$/.exec(e164);
	if (espanol) return `+34 ${espanol[1]} ${espanol[2]} ${espanol[3]}`;
	return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

/**
 * Formato mientras se escribe (guía visual): «600000000» → «600 000 000», «0034600…» → «+34 600 …».
 * Solo añade espacios a los números españoles; lo demás (otros países, más de 9 cifras) se deja como está.
 */
export function formatoAlEscribir(texto: string): string {
	const cifras = texto.replace(/\D/g, '');
	let prefijo = '';
	let nacional = cifras;
	if (texto.trimStart().startsWith('+')) {
		if (!cifras.startsWith('34')) return '34'.startsWith(cifras) ? `+${cifras}` : texto;
		prefijo = '+34';
		nacional = cifras.slice(2);
	} else if (cifras.startsWith('00')) {
		if (!cifras.startsWith('0034')) return '0034'.startsWith(cifras) ? cifras : texto;
		prefijo = '+34';
		nacional = cifras.slice(4);
	}
	if (nacional.length > 9) return texto;
	return [prefijo, ...(nacional.match(/\d{1,3}/g) ?? [])].filter(Boolean).join(' ');
}

/** Posición en `texto` justo después de los primeros `n` caracteres significativos (cifras y «+»). */
export function posicionTras(texto: string, n: number): number {
	let vistos = 0;
	for (let i = 0; i < texto.length; i++) {
		if (vistos === n) return i;
		if (/[\d+]/.test(texto[i])) vistos++;
	}
	return texto.length;
}
