import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { concepto, historial, ticket, usuario } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';

const { db } = conexionDePrueba();

let telefono = 600000100;
async function crearSocio() {
	const n = telefono++;
	const [fila] = await db
		.insert(usuario)
		.values({ nombre: `Socio ${n}`, telefono: `+34${n}`, email: `socio${n}@ejemplo.invalid` })
		.returning();
	return fila;
}

/** El error que lanza PostgreSQL, sea directo o envuelto por Drizzle. */
async function errorDe(promesa: Promise<unknown>) {
	try {
		await promesa;
	} catch (error) {
		const e = error as { cause?: { message?: string; constraint_name?: string } } & Error;
		return { mensaje: e.cause?.message ?? e.message, restriccion: e.cause?.constraint_name };
	}
	throw new Error('Se esperaba un error de la base de datos');
}

describe('datos iniciales', () => {
	it('crea los cuatro conceptos en su orden', async () => {
		const filas = await db.select().from(concepto).orderBy(asc(concepto.orden));
		expect(filas.map((c) => c.nombre)).toEqual([
			'Ferretería',
			'Alimentación',
			'Representación',
			'Transporte'
		]);
		expect(filas.every((c) => c.activo)).toBe(true);
	});
});

describe('restricciones del concepto', () => {
	it.each([
		['ferretería', 'concepto_nombre_unico'],
		['Otro', 'concepto_nombre_no_otro'],
		['', 'concepto_nombre_largo'],
		['x'.repeat(51), 'concepto_nombre_largo']
	])('rechaza «%s»', async (nombre, restriccion) => {
		const e = await errorDe(db.insert(concepto).values({ nombre }));
		expect(e.restriccion).toBe(restriccion);
	});
});

describe('restricciones del ticket', () => {
	it('un ticket nuevo queda pendiente de autorizar, con número y versión 1', async () => {
		const socio = await crearSocio();
		const [t] = await db
			.insert(ticket)
			.values({
				socioId: socio.id,
				importeCentimos: 1250,
				fechaCompra: '2026-11-04',
				conceptoId: 1
			})
			.returning();
		expect(t.estado).toBe('pendiente_autorizar');
		expect(t.numero).toBeGreaterThan(0);
		expect(t.version).toBe(1);
	});

	it('rechaza un importe de cero', async () => {
		const socio = await crearSocio();
		const e = await errorDe(
			db
				.insert(ticket)
				.values({ socioId: socio.id, importeCentimos: 0, fechaCompra: '2026-11-04', conceptoId: 1 })
		);
		expect(e.restriccion).toBe('ticket_importe_positivo');
	});

	it('exige un concepto predefinido u «Otro», no los dos ni ninguno', async () => {
		const socio = await crearSocio();
		const base = { socioId: socio.id, importeCentimos: 100, fechaCompra: '2026-11-04' };
		const ambos = await errorDe(
			db.insert(ticket).values({ ...base, conceptoId: 1, conceptoOtro: 'Floristería' })
		);
		const ninguno = await errorDe(db.insert(ticket).values(base));
		expect(ambos.restriccion).toBe('ticket_un_concepto');
		expect(ninguno.restriccion).toBe('ticket_un_concepto');
	});

	it('no admite Pagado sin pago', async () => {
		const socio = await crearSocio();
		const e = await errorDe(
			db.insert(ticket).values({
				socioId: socio.id,
				importeCentimos: 100,
				fechaCompra: '2026-11-04',
				conceptoOtro: 'Floristería',
				estado: 'pagado'
			})
		);
		expect(e.restriccion).toBe('ticket_pagado_con_pago');
	});
});

describe('restricciones del usuario', () => {
	it('no admite un usuario activo sin contraseña', async () => {
		const e = await errorDe(
			db.insert(usuario).values({
				nombre: 'Sin clave',
				telefono: '+34600000999',
				email: 'sinclave@ejemplo.invalid',
				estado: 'activo'
			})
		);
		expect(e.restriccion).toBe('usuario_activo_con_password');
	});

	it('guarda el email solo en minúsculas', async () => {
		const e = await errorDe(
			db.insert(usuario).values({
				nombre: 'Mayúsculas',
				telefono: '+34600000998',
				email: 'Socio@Ejemplo.invalid'
			})
		);
		expect(e.restriccion).toBe('usuario_email_minusculas');
	});
});

describe('historial inmutable (E-01)', () => {
	it('rechaza modificar una entrada y permite borrarla con su ticket', async () => {
		const socio = await crearSocio();
		const [t] = await db
			.insert(ticket)
			.values({ socioId: socio.id, importeCentimos: 500, fechaCompra: '2026-11-04', conceptoId: 2 })
			.returning();
		const [h] = await db
			.insert(historial)
			.values({
				ticketId: t.id,
				usuarioId: socio.id,
				accion: 'crear',
				estadoDestino: 'pendiente_autorizar'
			})
			.returning();

		const e = await errorDe(
			db.update(historial).set({ motivo: 'cambiado' }).where(eq(historial.id, h.id))
		);
		expect(e.mensaje).toContain('El historial no se puede modificar');

		await db.delete(ticket).where(eq(ticket.id, t.id));
		const quedan = await db.select().from(historial).where(eq(historial.id, h.id));
		expect(quedan).toHaveLength(0);
	});
});
