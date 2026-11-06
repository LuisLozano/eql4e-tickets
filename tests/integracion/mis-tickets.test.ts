import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
	detalleTicket,
	ficheroVisible,
	misTickets,
	totalesSocio
} from '../../src/lib/server/dominio/ticket/consultas.ts';
import { crearTicket, type Almacen } from '../../src/lib/server/dominio/ticket/crear.ts';
import { historial, pago, ticket } from '../../src/lib/server/infra/db/esquema.ts';
import type { EstadoTicket } from '../../src/lib/estados.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const sinDisco: Almacen = { guardar: async () => {}, borrar: async () => {} };
const foto = {
	nombreOriginal: 'ticket.jpg',
	tipoMime: 'image/webp',
	extension: 'webp',
	datos: new Uint8Array([1])
};

/** Un ticket recién enviado (con su fichero y su historial). */
async function enviar(
	socioId: string,
	cambios: {
		importeCentimos?: number;
		conceptoId?: number | null;
		conceptoOtro?: string | null;
	} = {}
) {
	const r = await crearTicket(
		db,
		sinDisco,
		socioId,
		{
			importeCentimos: 1000,
			fechaCompra: '2026-11-02',
			conceptoId: 1,
			conceptoOtro: null,
			observaciones: null,
			...cambios
		},
		[
			foto,
			{ ...foto, nombreOriginal: 'factura.pdf', tipoMime: 'application/pdf', extension: 'pdf' }
		],
		new Date()
	);
	if (!r.ok) throw new Error(r.motivo);
	return r;
}

/** Un ticket en otro estado, insertado tal cual (autorizar, rechazar y pagar llegan más adelante). */
async function enEstado(
	socioId: string,
	estado: EstadoTicket,
	importeCentimos: number,
	extra: Partial<typeof ticket.$inferInsert> = {}
) {
	const [t] = await db
		.insert(ticket)
		.values({
			socioId,
			importeCentimos,
			fechaCompra: '2026-01-10',
			conceptoId: 2,
			estado,
			...extra
		})
		.returning();
	return t;
}

async function pagoDe(socioId: string, fechaPago: string, importe: number) {
	const tesorero = await crearUsuario(db, { esTesorero: true });
	const [p] = await db
		.insert(pago)
		.values({
			socioId,
			fechaPago,
			metodo: 'bizum',
			importeTotalCentimos: importe,
			registradoPor: tesorero.id
		})
		.returning();
	return p;
}

describe('mis tickets (HU-S02)', () => {
	it('solo los propios, lo más reciente primero, con el nombre del concepto o el texto de «Otro»', async () => {
		const socia = await crearUsuario(db);
		const otro = await crearUsuario(db);
		const primero = await enviar(socia.id);
		const segundo = await enviar(socia.id, { conceptoId: null, conceptoOtro: 'Floristería' });
		await enviar(otro.id);

		expect(await misTickets(db, socia.id)).toEqual([
			{
				numero: segundo.numero,
				importeCentimos: 1000,
				fechaCompra: '2026-11-02',
				concepto: 'Floristería',
				estado: 'pendiente_autorizar',
				motivoRechazo: null
			},
			{
				numero: primero.numero,
				importeCentimos: 1000,
				fechaCompra: '2026-11-02',
				concepto: 'Ferretería',
				estado: 'pendiente_autorizar',
				motivoRechazo: null
			}
		]);
	});

	it('filtra: «pendientes» agrupa por autorizar y por pagar', async () => {
		const socia = await crearUsuario(db);
		await enviar(socia.id);
		await enEstado(socia.id, 'pendiente_pago', 200);
		await enEstado(socia.id, 'rechazado', 300, { motivoRechazo: 'Foto borrosa' });
		await enEstado(socia.id, 'anulado', 400);

		const estados = async (filtro?: Parameters<typeof misTickets>[2]) =>
			(await misTickets(db, socia.id, filtro)).map((t) => t.estado).sort();
		expect(await estados('pendientes')).toEqual(['pendiente_autorizar', 'pendiente_pago']);
		expect(await estados('rechazado')).toEqual(['rechazado']);
		expect(await estados('anulado')).toEqual(['anulado']);
		expect(await estados('pagado')).toEqual([]);
		expect(await estados()).toHaveLength(4);
		expect((await misTickets(db, socia.id, 'rechazado'))[0].motivoRechazo).toBe('Foto borrosa');
	});

	it('totales: por autorizar, por cobrar y cobrado en el año, por la fecha del pago', async () => {
		const socia = await crearUsuario(db);
		await enviar(socia.id, { importeCentimos: 2345 });
		await enviar(socia.id, { importeCentimos: 100 });
		await enEstado(socia.id, 'pendiente_pago', 1875);
		const deEsteAnio = await pagoDe(socia.id, '2026-03-01', 3240);
		const delAnterior = await pagoDe(socia.id, '2025-12-30', 999);
		await enEstado(socia.id, 'pagado', 3240, { pagoId: deEsteAnio.id });
		await enEstado(socia.id, 'pagado', 999, { pagoId: delAnterior.id });
		await enEstado(socia.id, 'rechazado', 5000, { motivoRechazo: 'No es de la asociación' });

		expect(await totalesSocio(db, socia.id, 2026)).toEqual({
			porAutorizar: 2445,
			porCobrar: 1875,
			cobrado: 3240
		});
		expect(await totalesSocio(db, (await crearUsuario(db)).id, 2026)).toEqual({
			porAutorizar: 0,
			porCobrar: 0,
			cobrado: 0
		});
	});
});

describe('detalle de un ticket (HU-S03)', () => {
	it('datos, ficheros en orden e historial con el nombre de quien actuó, lo último primero', async () => {
		const socia = await crearUsuario(db);
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const r = await enviar(socia.id);
		await db
			.update(ticket)
			.set({ estado: 'rechazado', motivoRechazo: 'Foto borrosa' })
			.where(eq(ticket.id, r.id));
		await db.insert(historial).values({
			ticketId: r.id,
			usuarioId: tesorero.id,
			accion: 'rechazar',
			estadoOrigen: 'pendiente_autorizar',
			estadoDestino: 'rechazado',
			motivo: 'Foto borrosa',
			creadoEn: new Date(Date.now() + 60_000)
		});

		const d = await detalleTicket(db, socia.id, r.numero);
		expect(d).toMatchObject({
			numero: r.numero,
			importeCentimos: 1000,
			concepto: 'Ferretería',
			observaciones: null,
			estado: 'rechazado',
			motivoRechazo: 'Foto borrosa'
		});
		expect(d!.ficheros.map((f) => f.nombreOriginal)).toEqual(['ticket.jpg', 'factura.pdf']);
		expect(d!.historial.map((h) => [h.accion, h.nombre, h.motivo])).toEqual([
			['rechazar', tesorero.nombre, 'Foto borrosa'],
			['crear', socia.nombre, null]
		]);
	});

	it('nulo si el ticket es de otro o no existe, aunque quien lo pida sea tesorero (R-01)', async () => {
		const socia = await crearUsuario(db);
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const r = await enviar(socia.id);
		expect(await detalleTicket(db, tesorero.id, r.numero)).toBeNull();
		expect(await detalleTicket(db, socia.id, 999_999_999)).toBeNull();
	});
});

describe('ficheros (RNF-13, R-01)', () => {
	it('los ve el dueño y cualquier tesorero; nadie más', async () => {
		const socia = await crearUsuario(db);
		const otro = await crearUsuario(db);
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const r = await enviar(socia.id);
		const [f] = (await detalleTicket(db, socia.id, r.numero))!.ficheros;

		expect(await ficheroVisible(db, { id: socia.id, esTesorero: false }, f.id)).toMatchObject({
			nombreOriginal: 'ticket.jpg',
			tipoMime: 'image/webp',
			ruta: expect.stringMatching(/\.webp$/)
		});
		expect(await ficheroVisible(db, { id: tesorero.id, esTesorero: true }, f.id)).not.toBeNull();
		expect(await ficheroVisible(db, { id: otro.id, esTesorero: false }, f.id)).toBeNull();
		expect(
			await ficheroVisible(db, { id: socia.id, esTesorero: false }, crypto.randomUUID())
		).toBeNull();
	});
});
