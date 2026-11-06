import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detalleTicket } from '../../src/lib/server/dominio/ticket/consultas.ts';
import {
	crearTicket,
	type DatosTicket,
	type FicheroNuevo
} from '../../src/lib/server/dominio/ticket/crear.ts';
import { editarTicket, type Edicion } from '../../src/lib/server/dominio/ticket/editar.ts';
import { cambiarEstado } from '../../src/lib/server/dominio/ticket/servicio.ts';
import { almacenEnDisco } from '../../src/lib/server/infra/almacenamiento/disco.ts';
import {
	concepto,
	historial,
	ticket,
	ticketFichero
} from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const ayer = new Date('2026-11-05T10:00:00Z');
const ahora = new Date('2026-11-06T10:00:00Z');

let raiz: string;
let almacen: ReturnType<typeof almacenEnDisco>;
beforeAll(async () => {
	raiz = await mkdtemp(join(tmpdir(), 'eql4e-edicion-'));
	almacen = almacenEnDisco(raiz);
});
afterAll(() => rm(raiz, { recursive: true, force: true }));

const enDisco = async () =>
	(await readdir(raiz, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).length;

const fichero = (nombre: string): FicheroNuevo => ({
	nombreOriginal: nombre,
	tipoMime: 'image/webp',
	extension: 'webp',
	datos: new TextEncoder().encode(nombre)
});

const datos: DatosTicket = {
	importeCentimos: 1000,
	fechaCompra: '2026-11-01',
	conceptoId: 1,
	conceptoOtro: null,
	observaciones: null
};

/** Un socio con un ticket pendiente de dos fotos, y un tesorero. */
async function escena(conexion: Conexion = db) {
	const [s, t] = await Promise.all([
		crearUsuario(conexion),
		crearUsuario(conexion, { esTesorero: true, esSocio: false })
	]);
	const socio = { id: s.id, esTesorero: false };
	const tesorero = { id: t.id, esTesorero: true };
	const r = await crearTicket(
		conexion,
		almacen,
		socio.id,
		datos,
		[fichero('a.jpg'), fichero('b.jpg')],
		ayer
	);
	if (!r.ok) throw new Error('no se creó');
	const ficheros = await conexion
		.select()
		.from(ticketFichero)
		.where(eq(ticketFichero.ticketId, r.id))
		.orderBy(asc(ticketFichero.orden));
	return { socio, tesorero, numero: r.numero, id: r.id, ficheros };
}

const edicion = (cambios: Partial<Edicion> = {}): Edicion => ({
	version: 1,
	datos,
	quitar: [],
	nuevos: [],
	...cambios
});

const estadoDe = async (id: string) => (await db.select().from(ticket).where(eq(ticket.id, id)))[0];
const ultimaEntrada = async (id: string) =>
	(
		await db.select().from(historial).where(eq(historial.ticketId, id)).orderBy(asc(historial.id))
	).at(-1)!;

describe('editar un ticket pendiente (HU-S04)', () => {
	it('cambia los datos, sustituye una foto sin borrarla y deja en el historial qué cambió', async () => {
		const { socio, numero, id, ficheros } = await escena();
		const antes = await enDisco();
		const r = await editarTicket(
			db,
			almacen,
			socio,
			numero,
			edicion({
				datos: { ...datos, importeCentimos: 1250, observaciones: 'Faltaba el IVA' },
				quitar: [ficheros[0].id],
				nuevos: [fichero('c.jpg')]
			}),
			ahora
		);
		expect(r).toEqual({ ok: true, accion: 'editar' });

		expect(await estadoDe(id)).toMatchObject({
			estado: 'pendiente_autorizar',
			importeCentimos: 1250,
			observaciones: 'Faltaba el IVA',
			version: 2,
			actualizadoEn: ahora
		});
		const ahoraFicheros = await db
			.select()
			.from(ticketFichero)
			.where(eq(ticketFichero.ticketId, id))
			.orderBy(asc(ticketFichero.orden));
		expect(ahoraFicheros.map((f) => [f.nombreOriginal, f.orden, f.sustituidoEn])).toEqual([
			['a.jpg', 1, ahora],
			['b.jpg', 2, null],
			['c.jpg', 3, null]
		]);
		expect(ahoraFicheros[0].sustituidoPor).toBe(socio.id);
		// El sustituido sigue en el disco: solo lo borrará la purga.
		expect(await enDisco()).toBe(antes + 1);

		const nuevo = ahoraFicheros[2].id;
		expect(await ultimaEntrada(id)).toMatchObject({
			usuarioId: socio.id,
			accion: 'editar',
			estadoOrigen: 'pendiente_autorizar',
			estadoDestino: 'pendiente_autorizar',
			cambios: {
				importeCentimos: [1000, 1250],
				observaciones: [null, 'Faltaba el IVA'],
				ficheros: [[ficheros[0].id], [nuevo]]
			}
		});

		// El detalle muestra los vigentes; el sustituido, aparte, para enlazarlo desde el historial.
		const detalle = (await detalleTicket(db, socio.id, numero))!;
		expect(detalle.ficheros.map((f) => f.nombreOriginal)).toEqual(['b.jpg', 'c.jpg']);
		expect(detalle.sustituidos.map((f) => f.id)).toEqual([ficheros[0].id]);
		expect(detalle.historial[0].cambios?.importeCentimos).toEqual([1000, 1250]);
	});

	it('el concepto se guarda por su nombre, también el de «Otro»', async () => {
		const { socio, numero, id } = await escena();
		const [{ nombre }] = await db
			.select({ nombre: concepto.nombre })
			.from(concepto)
			.where(eq(concepto.id, 1));
		await editarTicket(
			db,
			almacen,
			socio,
			numero,
			edicion({ datos: { ...datos, conceptoId: null, conceptoOtro: 'Floristería' } }),
			ahora
		);
		expect((await ultimaEntrada(id)).cambios).toEqual({ concepto: [nombre, 'Floristería'] });
	});

	it('sin cambios no guarda nada', async () => {
		const { socio, numero, id } = await escena();
		expect(await editarTicket(db, almacen, socio, numero, edicion(), ahora)).toEqual({
			ok: false,
			motivo: 'sin_cambios'
		});
		expect((await estadoDe(id)).version).toBe(1);
	});

	it('si un tesorero lo revisó mientras tanto, no se aplica y los ficheros nuevos se borran (E-04)', async () => {
		const { socio, tesorero, numero, id } = await escena();
		await cambiarEstado(db, tesorero, numero, 'autorizar', { version: 1 }, ahora);
		const antes = await enDisco();
		const cambio = edicion({
			datos: { ...datos, importeCentimos: 999 },
			nuevos: [fichero('tarde.jpg')]
		});
		expect(await editarTicket(db, almacen, socio, numero, cambio, ahora)).toEqual({
			ok: false,
			motivo: 'modificado'
		});
		// Aunque traiga la versión nueva: autorizado ya no se edita.
		expect(
			await editarTicket(db, almacen, socio, numero, { ...cambio, version: 2 }, ahora)
		).toEqual({ ok: false, motivo: 'estado' });
		expect(await estadoDe(id)).toMatchObject({ importeCentimos: 1000, estado: 'pendiente_pago' });
		expect(await enDisco()).toBe(antes);
	});

	it('nadie más puede editarlo, ni un tesorero (R-01)', async () => {
		const { tesorero, numero } = await escena();
		const otro = { id: (await crearUsuario(db)).id, esTesorero: false };
		for (const actor of [otro, tesorero]) {
			expect(await editarTicket(db, almacen, actor, numero, edicion(), ahora)).toEqual({
				ok: false,
				motivo: 'no_encontrado'
			});
		}
		expect(await editarTicket(db, almacen, otro, 2_000_000_000, edicion(), ahora)).toMatchObject({
			motivo: 'no_encontrado'
		});
	});

	it('entre 1 y 5 ficheros, y solo se quitan los suyos vigentes', async () => {
		const { socio, numero, ficheros } = await escena();
		const sinFicheros = edicion({ quitar: ficheros.map((f) => f.id) });
		const demasiados = edicion({ nuevos: ['1', '2', '3', '4'].map((n) => fichero(`${n}.jpg`)) });
		const ajeno = edicion({ quitar: [randomUUID()] });
		for (const e of [sinFicheros, demasiados, ajeno]) {
			expect(await editarTicket(db, almacen, socio, numero, e, ahora)).toEqual({
				ok: false,
				motivo: 'ficheros'
			});
		}
		// Quitar los dos y poner uno nuevo sí vale.
		expect(
			await editarTicket(
				db,
				almacen,
				socio,
				numero,
				edicion({ quitar: ficheros.map((f) => f.id), nuevos: [fichero('bueno.jpg')] }),
				ahora
			)
		).toMatchObject({ ok: true });
	});

	it('puede conservar un concepto ya desactivado, pero no elegir otro desactivado', async () => {
		// En una transacción que se deshace: los conceptos son de todos y otras pruebas los cuentan.
		class Deshacer extends Error {}
		await expect(
			db.transaction(async (tx) => {
				const { socio, numero, id } = await escena(tx);
				const [viejo, otroViejo] = await tx
					.insert(concepto)
					.values([
						{ nombre: `Viejo ${randomUUID().slice(0, 8)}`, activo: false },
						{ nombre: `Otro viejo ${randomUUID().slice(0, 8)}`, activo: false }
					])
					.returning();
				await tx.update(ticket).set({ conceptoId: viejo.id }).where(eq(ticket.id, id));

				const conViejo = { ...datos, conceptoId: viejo.id, importeCentimos: 1100 };
				expect(
					await editarTicket(tx, almacen, socio, numero, edicion({ datos: conViejo }), ahora)
				).toMatchObject({ ok: true });
				expect(
					await editarTicket(
						tx,
						almacen,
						socio,
						numero,
						edicion({ version: 2, datos: { ...conViejo, conceptoId: otroViejo.id } }),
						ahora
					)
				).toEqual({ ok: false, motivo: 'concepto' });
				throw new Deshacer();
			})
		).rejects.toBeInstanceOf(Deshacer);
	});
});

describe('corregir y reenviar un ticket rechazado (HU-S06)', () => {
	it('vuelve a pendiente de autorizar; sin cambios también vale', async () => {
		const { socio, tesorero, numero, id } = await escena();
		await cambiarEstado(
			db,
			tesorero,
			numero,
			'rechazar',
			{ version: 1, motivo: 'La foto está borrosa' },
			ahora
		);
		expect(await editarTicket(db, almacen, socio, numero, edicion({ version: 2 }), ahora)).toEqual({
			ok: true,
			accion: 'reenviar'
		});
		expect(await estadoDe(id)).toMatchObject({ estado: 'pendiente_autorizar', version: 3 });
		expect(await ultimaEntrada(id)).toMatchObject({
			accion: 'reenviar',
			estadoOrigen: 'rechazado',
			estadoDestino: 'pendiente_autorizar',
			cambios: null
		});
		// El rechazo y su motivo siguen en el historial.
		const detalle = (await detalleTicket(db, socio.id, numero))!;
		expect(detalle.historial.map((h) => [h.accion, h.motivo])).toEqual([
			['reenviar', null],
			['rechazar', 'La foto está borrosa'],
			['crear', null]
		]);
	});
});
