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
