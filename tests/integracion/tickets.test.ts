import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	conceptosActivos,
	crearTicket,
	type Almacen,
	type FicheroNuevo
} from '../../src/lib/server/dominio/ticket/crear.ts';
import { almacenEnDisco } from '../../src/lib/server/infra/almacenamiento/disco.ts';
import {
	concepto,
	historial,
	ticket,
	ticketFichero
} from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const ahora = new Date('2026-11-05T10:00:00Z');

let raiz: string;
let almacen: ReturnType<typeof almacenEnDisco>;
beforeAll(async () => {
	raiz = await mkdtemp(join(tmpdir(), 'eql4e-tickets-'));
	almacen = almacenEnDisco(raiz);
});
afterAll(() => rm(raiz, { recursive: true, force: true }));

/** Todos los ficheros que hay en el almacén, con su ruta relativa. */
const enDisco = async () =>
	(await readdir(raiz, { recursive: true, withFileTypes: true }))
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath, e.name).slice(raiz.length + 1));

const fichero = (nombre: string, extension = 'webp'): FicheroNuevo => ({
	nombreOriginal: nombre,
	tipoMime: extension === 'pdf' ? 'application/pdf' : 'image/webp',
	extension,
	datos: new TextEncoder().encode(nombre)
});

const datos = {
	importeCentimos: 2345,
	fechaCompra: '2026-11-02',
	conceptoId: 1,
	conceptoOtro: null,
	observaciones: 'Material para el escenario'
};

describe('enviar ticket (HU-S01)', () => {
	it('crea el ticket pendiente de autorizar, con sus ficheros en orden y la entrada del historial', async () => {
		const socio = await crearUsuario(db);
		const r = await crearTicket(
			db,
			almacen,
			socio.id,
			datos,
			[fichero('frente.jpg'), fichero('factura.pdf', 'pdf')],
			ahora
		);
		if (!r.ok) throw new Error(r.motivo);

		const [t] = await db.select().from(ticket).where(eq(ticket.id, r.id));
		expect(t).toMatchObject({
			...datos,
			numero: r.numero,
			socioId: socio.id,
			estado: 'pendiente_autorizar',
			version: 1
		});

		const ficheros = await db
			.select()
			.from(ticketFichero)
			.where(eq(ticketFichero.ticketId, r.id))
			.orderBy(asc(ticketFichero.orden));
		expect(ficheros.map((f) => [f.nombreOriginal, f.tipoMime, f.tamanoBytes, f.orden])).toEqual([
			['frente.jpg', 'image/webp', 10, 1],
			['factura.pdf', 'application/pdf', 11, 2]
		]);
		for (const f of ficheros) {
			// {año}/{mes}/{uuid}.{ext}, sin rastro del nombre original.
			expect(f.ruta).toMatch(/^2026\/11\/[0-9a-f-]{36}\.(webp|pdf)$/);
			expect(new TextDecoder().decode(await almacen.leer(f.ruta))).toBe(f.nombreOriginal);
		}

		const entradas = await db.select().from(historial).where(eq(historial.ticketId, r.id));
		expect(entradas).toMatchObject([
			{
				usuarioId: socio.id,
				accion: 'crear',
				estadoOrigen: null,
				estadoDestino: 'pendiente_autorizar'
			}
		]);
	});

	it('con «Otro», guarda el texto libre y ningún concepto', async () => {
		const socio = await crearUsuario(db);
		const r = await crearTicket(
			db,
			almacen,
			socio.id,
			{ ...datos, conceptoId: null, conceptoOtro: 'Floristería', observaciones: null },
			[fichero('flores.jpg')],
			ahora
		);
		if (!r.ok) throw new Error(r.motivo);
		const [t] = await db.select().from(ticket).where(eq(ticket.id, r.id));
		expect(t).toMatchObject({ conceptoId: null, conceptoOtro: 'Floristería', observaciones: null });
	});

	it('no admite un concepto desactivado o inexistente, y no guarda ningún fichero', async () => {
		const antes = await enDisco();
		// En una transacción que se deshace: otros ficheros de pruebas cuentan los conceptos.
		class Deshacer extends Error {}
		await expect(
			db.transaction(async (tx) => {
				const socio = await crearUsuario(tx);
				const [inactivo] = await tx
					.insert(concepto)
					.values({ nombre: 'Concepto inactivo', activo: false })
					.returning();
				expect((await conceptosActivos(tx)).map((c) => c.id)).not.toContain(inactivo.id);
				for (const conceptoId of [inactivo.id, 999_999]) {
					expect(
						await crearTicket(
							tx,
							almacen,
							socio.id,
							{ ...datos, conceptoId },
							[fichero('a.jpg')],
							ahora
						)
					).toEqual({ ok: false, motivo: 'concepto' });
				}
				throw new Deshacer();
			})
		).rejects.toBeInstanceOf(Deshacer);
		expect(await enDisco()).toEqual(antes);
	});

	it('si la base de datos falla, borra los ficheros ya guardados', async () => {
		const socio = await crearUsuario(db);
		const antes = await enDisco();
		await expect(
			crearTicket(
				db,
				almacen,
				socio.id,
				{ ...datos, importeCentimos: 0 },
				[fichero('a.jpg'), fichero('b.jpg')],
				ahora
			)
		).rejects.toThrow();
		expect(await enDisco()).toEqual(antes);
	});

	it('si falla el disco a mitad, borra lo que llegó a guardar y no crea el ticket', async () => {
		const socio = await crearUsuario(db);
		const borrados: string[] = [];
		let guardados = 0;
		const fallaAlSegundo: Almacen = {
			async guardar() {
				if (++guardados === 2) throw new Error('disco lleno');
			},
			async borrar(ruta) {
				borrados.push(ruta);
			}
		};
		await expect(
			crearTicket(db, fallaAlSegundo, socio.id, datos, [fichero('a.jpg'), fichero('b.jpg')], ahora)
		).rejects.toThrow('disco lleno');
		expect(borrados).toHaveLength(1);
		expect(await db.select().from(ticket).where(eq(ticket.socioId, socio.id))).toEqual([]);
	});
});

describe('conceptos activos', () => {
	it('los activos, en su orden', async () => {
		const nombres = (await conceptosActivos(db)).map((c) => c.nombre);
		expect(nombres.slice(0, 4)).toEqual([
			'Ferretería',
			'Alimentación',
			'Representación',
			'Transporte'
		]);
	});
});
