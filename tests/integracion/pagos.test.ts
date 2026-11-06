import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EstadoTicket } from '../../src/lib/estados.ts';
import {
	detallePago,
	justificanteVisible,
	pendientesDeSocio,
	porPagar,
	ultimosPagos
} from '../../src/lib/server/dominio/pago/consultas.ts';
import { registrarPago, type DatosPago } from '../../src/lib/server/dominio/pago/registrar.ts';
import { detalleTicket } from '../../src/lib/server/dominio/ticket/consultas.ts';
import { almacenEnDisco } from '../../src/lib/server/infra/almacenamiento/disco.ts';
import { historial, pago, ticket } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const ahora = new Date('2026-11-06T10:00:00Z');

let raiz: string;
let almacen: ReturnType<typeof almacenEnDisco>;
beforeAll(async () => {
	raiz = await mkdtemp(join(tmpdir(), 'eql4e-pagos-'));
	almacen = almacenEnDisco(raiz);
});
afterAll(() => rm(raiz, { recursive: true, force: true }));

const enDisco = async () =>
	(await readdir(raiz, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).length;

const justificante = {
	nombreOriginal: 'bizum.pdf',
	tipoMime: 'application/pdf',
	extension: 'pdf',
	datos: new TextEncoder().encode('%PDF-1.4')
};

async function ticketDe(socioId: string, importeCentimos: number, estado: EstadoTicket) {
	const [t] = await db
		.insert(ticket)
		.values({ socioId, importeCentimos, fechaCompra: '2026-10-01', conceptoId: 1, estado })
		.returning();
	return t;
}

/** Un socio con dos tickets pendientes de pago (12,00 y 3,50) y uno sin autorizar, y un tesorero. */
async function escena() {
	const [s, t] = await Promise.all([
		crearUsuario(db),
		crearUsuario(db, { esTesorero: true, esSocio: false })
	]);
	const socio = { id: s.id, esTesorero: false };
	const tesorero = { id: t.id, esTesorero: true };
	const tickets = [
		await ticketDe(socio.id, 1200, 'pendiente_pago'),
		await ticketDe(socio.id, 350, 'pendiente_pago'),
		await ticketDe(socio.id, 999, 'pendiente_autorizar')
	];
	return { socio, tesorero, tickets };
}

const datos = (
	socioId: string,
	tickets: { numero: number; version: number }[],
	extra: Partial<DatosPago> = {}
): DatosPago => ({
	socioId,
	tickets: tickets.map(({ numero, version }) => ({ numero, version })),
	fechaPago: '2026-11-05',
	metodo: 'bizum',
	justificante: null,
	...extra
});

const estados = async (ids: string[]) =>
	(await db.select().from(ticket).where(inArray(ticket.id, ids)).orderBy(asc(ticket.numero))).map(
		(t) => [t.estado, t.pagoId, t.version]
	);

describe('registrar un pago (HU-T05)', () => {
	it('agrupa varios tickets del socio: total calculado, Pagado e historial con el pago', async () => {
		const { socio, tesorero, tickets } = await escena();
		const [a, b] = tickets;
		const antes = await enDisco();
		const r = await registrarPago(
			db,
			almacen,
			tesorero,
			datos(socio.id, [a, b], { justificante }),
			ahora
		);
		expect(r).toMatchObject({ ok: true, importeTotalCentimos: 1550 });
		if (!r.ok) return;

		expect(await estados([a.id, b.id])).toEqual([
			['pagado', r.id, 2],
			['pagado', r.id, 2]
		]);
		const [p] = await db.select().from(pago).where(eq(pago.id, r.id));
		expect(p).toMatchObject({
			socioId: socio.id,
			fechaPago: '2026-11-05',
			metodo: 'bizum',
			importeTotalCentimos: 1550,
			justificanteMime: 'application/pdf',
			registradoPor: tesorero.id
		});
		expect(await enDisco()).toBe(antes + 1);
		const entradas = await db.select().from(historial).where(eq(historial.pagoId, r.id));
		expect(entradas).toHaveLength(2);
		expect(entradas[0]).toMatchObject({
			usuarioId: tesorero.id,
			accion: 'pagar',
			estadoOrigen: 'pendiente_pago',
			estadoDestino: 'pagado'
		});

		// Lo que ve el socio en su ticket y el tesorero en el pago.
		const detalle = (await detalleTicket(db, socio.id, a.numero))!;
		expect(detalle.pago).toMatchObject({
			id: r.id,
			metodo: 'bizum',
			importeTotalCentimos: 1550,
			conJustificante: true,
			tickets: 2
		});
		expect(detalle.historial[0]).toMatchObject({ accion: 'pagar', metodoPago: 'bizum' });
		const delPago = (await detallePago(db, r.id))!;
		expect(delPago.tickets.map((t) => t.numero)).toEqual([a.numero, b.numero]);
		expect(delPago.registradoPor).toBeTruthy();
		expect((await ultimosPagos(db, 100)).find((x) => x.id === r.id)).toMatchObject({
			tickets: 2,
			anulado: false
		});

		// El justificante: su socio y los tesoreros; nadie más (R-01).
		const otro = await crearUsuario(db);
		expect(await justificanteVisible(db, socio, r.id)).toMatchObject({
			tipoMime: 'application/pdf'
		});
		expect(await justificanteVisible(db, tesorero, r.id)).not.toBeNull();
		expect(await justificanteVisible(db, { id: otro.id, esTesorero: false }, r.id)).toBeNull();
	});

	it('solo tickets pendientes de pago del mismo socio y sin cambios (E-02, E-04)', async () => {
		const { socio, tesorero, tickets } = await escena();
		const [a, , sinAutorizar] = tickets;
		const otro = await escena();
		const antes = await enDisco();
		const casos = [
			datos(socio.id, [a, otro.tickets[0]]), // de otro socio
			datos(socio.id, [sinAutorizar]), // no está pendiente de pago
			datos(socio.id, [{ numero: a.numero, version: 7 }]), // versión vieja
			datos(socio.id, [{ numero: 2_000_000_000, version: 1 }]), // no existe
			datos(socio.id, [])
		];
		for (const caso of casos) {
			expect(await registrarPago(db, almacen, tesorero, { ...caso, justificante }, ahora)).toEqual({
				ok: false,
				motivo: 'modificado'
			});
		}
		// No se ha tocado nada y el justificante no se queda en el disco.
		expect(await estados([a.id])).toEqual([['pendiente_pago', null, 1]]);
		expect(await enDisco()).toBe(antes);
	});

	it('dos tesoreros a la vez: solo uno registra el pago', async () => {
		const { socio, tesorero, tickets } = await escena();
		const otroTesorero = {
			id: (await crearUsuario(db, { esTesorero: true })).id,
			esTesorero: true
		};
		const resultados = await Promise.all(
			[tesorero, otroTesorero].map((t) =>
				registrarPago(db, almacen, t, datos(socio.id, [tickets[0]]), ahora)
			)
		);
		expect(resultados.filter((r) => r.ok)).toHaveLength(1);
		expect(resultados.find((r) => !r.ok)).toEqual({ ok: false, motivo: 'modificado' });
	});

	it('un tesorero no paga sus propios tickets y un socio no paga nada (R-04)', async () => {
		const { socio, tickets } = await escena();
		const tesoreroSocio = (await crearUsuario(db, { esTesorero: true })).id;
		const suyo = await ticketDe(tesoreroSocio, 500, 'pendiente_pago');
		expect(
			await registrarPago(
				db,
				almacen,
				{ id: tesoreroSocio, esTesorero: true },
				datos(tesoreroSocio, [suyo]),
				ahora
			)
		).toEqual({ ok: false, motivo: 'propio' });
		expect(await registrarPago(db, almacen, socio, datos(socio.id, [tickets[0]]), ahora)).toEqual({
			ok: false,
			motivo: 'permiso'
		});
	});
});

describe('lo pendiente de pago (HU-T05)', () => {
	it('por socio, con cuántos y cuánto; sin los del propio tesorero', async () => {
		const { socio, tickets } = await escena();
		const tesoreroSocio = (await crearUsuario(db, { esTesorero: true })).id;
		await ticketDe(tesoreroSocio, 500, 'pendiente_pago');

		const lista = await porPagar(db, tesoreroSocio);
		expect(lista.find((p) => p.socioId === socio.id)).toMatchObject({
			tickets: 2,
			totalCentimos: 1550
		});
		expect(lista.find((p) => p.socioId === tesoreroSocio)).toBeUndefined();

		const pendientes = (await pendientesDeSocio(db, socio.id))!;
		expect(pendientes.tickets.map((t) => [t.numero, t.version])).toEqual([
			[tickets[0].numero, 1],
			[tickets[1].numero, 1]
		]);
	});
});
