// CSV del listado del tesorero (HU-T07), para abrirlo con Excel en español: separador «;», coma
// decimal, UTF-8 con BOM (sin él, Excel lo lee como Latin-1) y fin de línea CRLF.
import { TEXTO_ESTADO } from '#lib/estados.ts';
import { formatoDia, formatoFechaHora, formatoNumeroTicket } from '#lib/formato.ts';
import { TEXTO_METODO } from '#lib/pagos.ts';
import type { FilaExportada } from '#lib/server/dominio/ticket/listado.ts';
import { formatoTelefono } from '#lib/telefono.ts';

const CABECERA = [
	'Ticket',
	'Fecha de compra',
	'Enviado',
	'Socio',
	'Teléfono',
	'Concepto',
	'Importe (€)',
	'Estado',
	'Fecha de pago',
	'Método de pago'
];

/**
 * Un campo: entre comillas si lleva separador, comillas o saltos de línea. Un texto que empieza por
 * = + - @ (o tabulador o retorno) lleva delante un apóstrofo, para que Excel no lo ejecute como
 * fórmula (inyección CSV): el nombre del socio y el concepto «Otro» son texto libre.
 */
export function campo(valor: string): string {
	const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
	return /[;"\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
}

/** 123456 → «1234,56»: número que Excel entiende, sin el símbolo ni separador de miles. */
const importe = (centimos: number) => (centimos / 100).toFixed(2).replace('.', ',');

export function csvTickets(filas: FilaExportada[]): string {
	const lineas = filas.map((t) =>
		[
			formatoNumeroTicket(t.numero),
			formatoDia(t.fechaCompra),
			formatoFechaHora(t.creadoEn),
			t.socio,
			// Sin el +34 de los españoles: con un «+» delante, Excel lo tomaría por una fórmula.
			formatoTelefono(t.telefono).replace(/^\+34 /, ''),
			t.concepto ?? `Otro: ${t.conceptoOtro}`,
			importe(t.importeCentimos),
			TEXTO_ESTADO[t.estado],
			t.fechaPago ? formatoDia(t.fechaPago) : '',
			t.metodoPago ? TEXTO_METODO[t.metodoPago] : ''
		].map(campo)
	);
	return '﻿' + [CABECERA, ...lineas].map((l) => l.join(';')).join('\r\n') + '\r\n';
}
