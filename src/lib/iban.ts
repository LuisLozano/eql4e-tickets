// IBAN de la cuenta donde el socio recibe los pagos (HU-S07). Se guarda sin espacios y en mayúsculas.

/** Longitud del IBAN en los países de la zona SEPA. */
const LONGITUD = new Map(
	(
		'AD24 AT20 BE16 BG22 CH21 CY28 CZ24 DE22 DK18 EE20 ES24 FI18 FR27 GB22 GI23 GR27 HR21 HU28 IE22 ' +
		'IS26 IT27 LI21 LT20 LU20 LV21 MC27 MT31 NL18 NO15 PL28 PT25 RO24 SE24 SI19 SK24 SM27 VA22'
	)
		.split(' ')
		.map((p): [string, number] => [p.slice(0, 2), Number(p.slice(2))])
);

/** Dígitos de control (ISO 13616): las 4 primeras posiciones al final, letras a números, módulo 97. */
function controlCorrecto(iban: string): boolean {
	const reordenado = iban.slice(4) + iban.slice(0, 4);
	let resto = 0;
	for (const c of reordenado) {
		const valor = parseInt(c, 36);
		resto = (resto * (valor > 9 ? 100 : 10) + valor) % 97;
	}
	return resto === 1;
}

/** «es91 2100-0418 …» → «ES9121000418…». Nulo si no es un IBAN SEPA válido. */
export function normalizarIban(texto: string): string | null {
	const iban = texto.replace(/[\s-]/g, '').toUpperCase();
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return null;
	if (LONGITUD.get(iban.slice(0, 2)) !== iban.length) return null;
	return controlCorrecto(iban) ? iban : null;
}

/** «ES9121000418…» → «ES91 2100 0418 …», en grupos de 4 como en los extractos. */
export const formatoIban = (iban: string) => iban.replace(/(.{4})(?=.)/g, '$1 ');
