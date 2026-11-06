import { describe, expect, it } from 'vitest';
import type { FilaExportada } from '#lib/server/dominio/ticket/listado.ts';
import { campo, csvTickets } from './csv.ts';

const fila: FilaExportada = {
	numero: 42,
	fechaCompra: '2026-10-03',
	creadoEn: new Date('2026-10-04T08:30:00Z'),
	socio: 'Ana Pérez',
	telefono: '+34612345678',
	concepto: 'Ferretería',
	conceptoOtro: null,
	importeCentimos: 123456,
	estado: 'pagado',
	fechaPago: '2026-10-10',
	metodoPago: 'bizum'
};

describe('csvTickets (HU-T07)', () => {
	it('empieza por el BOM, separa con «;», usa coma decimal y termina las líneas en CRLF', () => {
		const csv = csvTickets([fila]);
		expect(csv.startsWith('﻿Ticket;Fecha de compra;Enviado;Socio;Teléfono;')).toBe(true);
		expect(csv.split('\r\n')[1]).toBe(
			'T-000042;03/10/2026;04/10/2026 10:30;Ana Pérez;612 345 678;Ferretería;1234,56;Pagado;10/10/2026;Bizum'
		);
		expect(csv.endsWith('\r\n')).toBe(true);
	});

	it('un ticket sin pagar deja vacías las columnas del pago; «Otro» lleva su texto', () => {
		const csv = csvTickets([
			{
				...fila,
				concepto: null,
				conceptoOtro: 'Floristería',
				estado: 'pendiente_pago',
				importeCentimos: 500,
				fechaPago: null,
				metodoPago: null
			}
		]);
		expect(csv.split('\r\n')[1]).toBe(
			'T-000042;03/10/2026;04/10/2026 10:30;Ana Pérez;612 345 678;Otro: Floristería;5,00;Pendiente de pago;;'
		);
	});

	it('sin tickets, solo la cabecera', () => {
		expect(csvTickets([]).split('\r\n')).toHaveLength(2);
	});
});

describe('campo', () => {
	it('entrecomilla lo que lleva separador, comillas o saltos de línea', () => {
		expect(campo('Pérez; Ana')).toBe('"Pérez; Ana"');
		expect(campo('El "bueno"')).toBe('"El ""bueno"""');
		expect(campo('dos\nlíneas')).toBe('"dos\nlíneas"');
		expect(campo('normal')).toBe('normal');
	});

	it('desactiva las fórmulas (inyección CSV)', () => {
		expect(campo('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
		expect(campo('+34')).toBe("'+34");
		expect(campo('-1')).toBe("'-1");
		expect(campo('@SUM(A1)')).toBe("'@SUM(A1)");
	});
});
