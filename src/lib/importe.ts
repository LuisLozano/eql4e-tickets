// Importes que escribe el socio (HU-S01). Se guardan en céntimos para no arrastrar errores de coma flotante.

export const IMPORTE_MAXIMO = 9_999_999; // 99.999,99 €

/**
 * «23,45», «23.45», «1.234,56», «23 €» → céntimos. Nulo si no es mayor que 0, tiene más de
 * 2 decimales o pasa del máximo. Con coma, los puntos son de miles; sin coma, «1.234» también.
 */
export function importeACentimos(texto: string): number | null {
	let limpio = texto.replace(/[\s€]/g, '');
	if (limpio.includes(',')) limpio = limpio.replaceAll('.', '').replace(',', '.');
	else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replaceAll('.', '');

	const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(limpio);
	if (!partes) return null;
	const centimos = Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
	return centimos > 0 && centimos <= IMPORTE_MAXIMO ? centimos : null;
}
