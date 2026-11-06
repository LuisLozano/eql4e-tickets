import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { ESTADOS_TICKET, type EstadoTicket } from '../../src/lib/estados.ts';
import {
	FILTROS_INICIALES,
	TAMANO_PAGINA,
	type FiltrosListado
} from '../../src/lib/listado-tickets.ts';
import {
	ORDEN_ESTADOS,
	listadoGlobal,
	opcionesListado
} from '../../src/lib/server/dominio/ticket/listado.ts';
import { concepto, pago, ticket, usuario } from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();

// Cada prueba trabaja en una transacción que se deshace, con un concepto propio: el listado es
// global y los demás ficheros de pruebas crean tickets a la vez.
class Deshacer extends Error {}
async function sinGuardar(prueba: (tx: Conexion) => Promise<void>) {
	await expect(
		db.transaction(async (tx) => {
			await prueba(tx);
			throw new Deshacer();
		})
	).rejects.toBeInstanceOf(Deshacer);
}

let siguiente = 0;
async function conceptoPropio(tx: Conexion) {
	const [c] = await tx
		.insert(concepto)
		.values({ nombre: `Listado ${process.pid}-${++siguiente}`, orden: 999 })
		.returning();
	return c.id;
}

async function pagoPara(tx: Conexion, socioId: string) {
	const tesorero = await crearUsuario(tx, { esTesorero: true, esSocio: false });
	const [p] = await tx
		.insert(pago)
		.values({
			socioId,
			fechaPago: '2026-11-01',
			metodo: 'bizum',
			importeTotalCentimos: 1,
			registradoPor: tesorero.id
		})
		.returning();
	return p.id;
}

type Datos = {
	socioId: string;
	estado?: EstadoTicket;
	importeCentimos?: number;
	fechaCompra?: string;
	creadoEn?: Date;
	conceptoId?: number | null;
	conceptoOtro?: string | null;
};

async function insertar(tx: Conexion, conceptoId: number, d: Datos) {
	const estado = d.estado ?? 'pendiente_autorizar';
	const [t] = await tx
		.insert(ticket)
		.values({
			socioId: d.socioId,
			estado,
			importeCentimos: d.importeCentimos ?? 1000,
			fechaCompra: d.fechaCompra ?? '2026-10-15',
			creadoEn: d.creadoEn ?? new Date('2026-10-15T10:00:00Z'),
			conceptoId: d.conceptoOtro ? null : (d.conceptoId ?? conceptoId),
			conceptoOtro: d.conceptoOtro ?? null,
			motivoRechazo: estado === 'rechazado' ? 'No se lee' : null,
			pagoId: estado === 'pagado' ? await pagoPara(tx, d.socioId) : null
		})
		.returning();
	return t.numero;
}

const numeros = async (tx: Conexion, f: Partial<FiltrosListado>) =>
	(await listadoGlobal(tx, { ...FILTROS_INICIALES, ...f })).filas.map((t) => t.numero);

describe('listado global (HU-T01)', () => {
	it('ORDEN_ESTADOS tiene todos los estados', () => {
		expect([...ORDEN_ESTADOS].sort()).toEqual([...ESTADOS_TICKET].sort());
	});

	it('por defecto: lo que requiere acción primero y, dentro de cada estado, lo más antiguo', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			const socio = await crearUsuario(tx);
			const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 10));
			const anulado = await insertar(tx, c, {
				socioId: socio.id,
				estado: 'anulado',
				creadoEn: dia(1)
			});
			const pagado = await insertar(tx, c, {
				socioId: socio.id,
				estado: 'pagado',
				creadoEn: dia(2)
			});
			const rechazado = await insertar(tx, c, {
				socioId: socio.id,
				estado: 'rechazado',
				creadoEn: dia(3)
			});
			const pagoReciente = await insertar(tx, c, {
				socioId: socio.id,
				estado: 'pendiente_pago',
				creadoEn: dia(9)
			});
			const pagoAntiguo = await insertar(tx, c, {
				socioId: socio.id,
				estado: 'pendiente_pago',
				creadoEn: dia(4)
			});
			const autorizarReciente = await insertar(tx, c, { socioId: socio.id, creadoEn: dia(8) });
			const autorizarAntiguo = await insertar(tx, c, { socioId: socio.id, creadoEn: dia(5) });

			expect(await numeros(tx, { concepto: c })).toEqual([
				autorizarAntiguo,
				autorizarReciente,
				pagoAntiguo,
				pagoReciente,
				rechazado,
				pagado,
				anulado
			]);
			// Al revés, los estados se invierten; dentro de cada uno sigue lo más antiguo primero.
			expect((await numeros(tx, { concepto: c, dir: 'desc' })).slice(0, 3)).toEqual([
				anulado,
				pagado,
				rechazado
			]);
		}));

	it('ordena por socio y concepto sin distinguir tildes ni mayúsculas, y por importe y fechas', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			const [alvaro, beatriz] = await Promise.all([crearUsuario(tx), crearUsuario(tx)]);
			await tx.update(usuario).set({ nombre: 'Álvaro Ruiz' }).where(eq(usuario.id, alvaro.id));
			await tx.update(usuario).set({ nombre: 'beatriz Gil' }).where(eq(usuario.id, beatriz.id));
			const deBeatriz = await insertar(tx, c, {
				socioId: beatriz.id,
				importeCentimos: 500,
				fechaCompra: '2026-10-01',
				creadoEn: new Date('2026-10-20T10:00:00Z')
			});
			const deAlvaro = await insertar(tx, c, {
				socioId: alvaro.id,
				importeCentimos: 9000,
				fechaCompra: '2026-10-09',
				creadoEn: new Date('2026-10-10T10:00:00Z')
			});

			expect(await numeros(tx, { concepto: c, orden: 'socio' })).toEqual([deAlvaro, deBeatriz]);
			expect(await numeros(tx, { concepto: c, orden: 'importe', dir: 'desc' })).toEqual([
				deAlvaro,
				deBeatriz
			]);
			expect(await numeros(tx, { concepto: c, orden: 'compra' })).toEqual([deBeatriz, deAlvaro]);
			expect(await numeros(tx, { concepto: c, orden: 'enviado' })).toEqual([deAlvaro, deBeatriz]);

			// Concepto: «Otro» ordena por su texto libre, junto a los demás.
			const socio = await crearUsuario(tx);
			const [z] = await tx
				.insert(concepto)
				.values({ nombre: `Zapatería ${process.pid}`, orden: 999 })
				.returning();
			const zapateria = await insertar(tx, c, { socioId: socio.id, conceptoId: z.id });
			const otro = await insertar(tx, c, { socioId: socio.id, conceptoOtro: 'énfasis floral' });
			expect(await numeros(tx, { socio: socio.id, orden: 'concepto' })).toEqual([otro, zapateria]);
		}));

	it('combina filtros: estados, concepto, socio, fechas de compra e importes (incluidos)', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			const [ana, luis] = await Promise.all([crearUsuario(tx), crearUsuario(tx)]);
			const a1 = await insertar(tx, c, {
				socioId: ana.id,
				importeCentimos: 2000,
				fechaCompra: '2026-10-01'
			});
			const a2 = await insertar(tx, c, {
				socioId: ana.id,
				estado: 'rechazado',
				importeCentimos: 5000,
				fechaCompra: '2026-10-31'
			});
			const a3 = await insertar(tx, c, {
				socioId: ana.id,
				estado: 'pagado',
				importeCentimos: 7000,
				fechaCompra: '2026-11-01'
			});
			const l1 = await insertar(tx, c, { socioId: luis.id, importeCentimos: 2000 });
			const otro = await insertar(tx, c, { socioId: ana.id, conceptoOtro: 'Floristería' });

			expect(await numeros(tx, { concepto: c, socio: ana.id })).toEqual([a1, a2, a3]);
			expect(
				await numeros(tx, { concepto: c, estados: ['pendiente_autorizar', 'rechazado'] })
			).toEqual([a1, l1, a2]);
			expect(await numeros(tx, { concepto: c, desde: '2026-10-01', hasta: '2026-10-31' })).toEqual([
				a1,
				l1,
				a2
			]);
			expect(await numeros(tx, { concepto: c, desde: '2026-10-02', socio: ana.id })).toEqual([
				a2,
				a3
			]);
			expect(await numeros(tx, { concepto: c, min: 2000, max: 5000, socio: ana.id })).toEqual([
				a1,
				a2
			]);
			expect(await numeros(tx, { concepto: 'otro', socio: ana.id })).toEqual([otro]);
		}));

	it('la fila trae lo que pinta la tabla: socio de baja y concepto libre', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			const baja = await crearUsuario(tx, { estado: 'baja' });
			await insertar(tx, c, { socioId: baja.id, conceptoOtro: 'Floristería' });
			const { filas } = await listadoGlobal(tx, { ...FILTROS_INICIALES, socio: baja.id });
			expect(filas).toEqual([
				expect.objectContaining({
					socioId: baja.id,
					socio: baja.nombre,
					socioDeBaja: true,
					concepto: null,
					conceptoOtro: 'Floristería',
					importeCentimos: 1000,
					fechaCompra: '2026-10-15',
					estado: 'pendiente_autorizar'
				})
			]);
		}));

	it('totales del resultado filtrado, por estado, y paginación de 50 en 50', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			const socio = await crearUsuario(tx);
			await tx.insert(ticket).values(
				Array.from({ length: TAMANO_PAGINA + 2 }, (_, i) => ({
					socioId: socio.id,
					importeCentimos: 100,
					fechaCompra: '2026-10-15',
					conceptoId: c,
					creadoEn: new Date(Date.UTC(2026, 9, 1, 0, i))
				}))
			);
			await insertar(tx, c, { socioId: socio.id, estado: 'rechazado', importeCentimos: 250 });

			const primera = await listadoGlobal(tx, { ...FILTROS_INICIALES, concepto: c });
			expect(primera.filas).toHaveLength(TAMANO_PAGINA);
			expect(primera.porEstado).toEqual([
				{ estado: 'pendiente_autorizar', tickets: TAMANO_PAGINA + 2, centimos: 5200 },
				{ estado: 'rechazado', tickets: 1, centimos: 250 }
			]);
			expect(primera.total).toEqual({ tickets: TAMANO_PAGINA + 3, centimos: 5450 });
			expect(primera).toMatchObject({ pagina: 1, paginas: 2 });

			// Fuera de rango se queda en la última.
			const ultima = await listadoGlobal(tx, { ...FILTROS_INICIALES, concepto: c, pagina: 9 });
			expect(ultima).toMatchObject({ pagina: 2, paginas: 2 });
			expect(ultima.filas.map((f) => f.estado)).toEqual([
				'pendiente_autorizar',
				'pendiente_autorizar',
				'rechazado'
			]);

			const vacio = await listadoGlobal(tx, { ...FILTROS_INICIALES, concepto: c, min: 99_999 });
			expect(vacio).toMatchObject({ filas: [], porEstado: [], pagina: 1, paginas: 1 });
			expect(vacio.total).toEqual({ tickets: 0, centimos: 0 });
		}));

	it('opciones: todos los conceptos, también inactivos, y solo socios con tickets', () =>
		sinGuardar(async (tx) => {
			const c = await conceptoPropio(tx);
			await tx.update(concepto).set({ activo: false }).where(eq(concepto.id, c));
			const conTickets = await crearUsuario(tx, { estado: 'baja' });
			const sinTickets = await crearUsuario(tx);
			await insertar(tx, c, { socioId: conTickets.id });
			await insertar(tx, c, { socioId: conTickets.id });

			const { conceptos, socios } = await opcionesListado(tx);
			expect(conceptos).toContainEqual({ id: c, nombre: expect.any(String), activo: false });
			expect(socios.filter((s) => s.id === conTickets.id)).toEqual([
				{ id: conTickets.id, nombre: conTickets.nombre, deBaja: true }
			]);
			expect(socios.map((s) => s.id)).not.toContain(sinTickets.id);
		}));
});
