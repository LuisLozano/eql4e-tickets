import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { EstadoTicket } from '../../src/lib/estados.ts';
import { detalleParaRevisar } from '../../src/lib/server/dominio/ticket/consultas.ts';
import { cambiarEstado } from '../../src/lib/server/dominio/ticket/servicio.ts';
import { historial, ticket } from '../../src/lib/server/infra/db/esquema.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
const ahora = new Date('2026-11-06T10:00:00Z');

async function ticketDe(socioId: string, estado: EstadoTicket = 'pendiente_autorizar') {
	const [t] = await db
		.insert(ticket)
		.values({
			socioId,
			importeCentimos: 1234,
			fechaCompra: '2026-11-01',
			conceptoId: 1,
			estado,
			motivoRechazo: estado === 'rechazado' ? 'Borrosa' : null
		})
		.returning();
	return t;
}

const estadoDe = async (id: string) => (await db.select().from(ticket).where(eq(ticket.id, id)))[0];
const historialDe = (id: string) =>
	db.select().from(historial).where(eq(historial.ticketId, id)).orderBy(asc(historial.id));

async function escena() {
	const [socio, tesorero] = await Promise.all([
		crearUsuario(db),
		crearUsuario(db, { esTesorero: true, esSocio: false })
	]);
	return {
		socio: { id: socio.id, esTesorero: false },
		tesorero: { id: tesorero.id, esTesorero: true },
		t: await ticketDe(socio.id)
	};
}

describe('autorizar y rechazar (HU-T03, T04)', () => {
	it('autorizar: pasa a pendiente de pago, sube la versión y queda en el historial', async () => {
		const { tesorero, t } = await escena();
		expect(await cambiarEstado(db, tesorero, t.numero, 'autorizar', { version: 1 }, ahora)).toEqual(
			{ ok: true, estado: 'pendiente_pago', version: 2 }
		);

		expect(await estadoDe(t.id)).toMatchObject({
			estado: 'pendiente_pago',
			version: 2,
			actualizadoEn: ahora
		});
		expect(await historialDe(t.id)).toEqual([
			expect.objectContaining({
				usuarioId: tesorero.id,
				accion: 'autorizar',
				estadoOrigen: 'pendiente_autorizar',
				estadoDestino: 'pendiente_pago',
				motivo: null,
				creadoEn: ahora
			})
		]);
	});

	it('rechazar: guarda el motivo (sin espacios de más) en el ticket y en el historial', async () => {
		const { tesorero, t } = await escena();
		const r = await cambiarEstado(
			db,
			tesorero,
			t.numero,
			'rechazar',
			{ version: 1, motivo: '  No se lee el importe  ' },
			ahora
		);
		expect(r).toEqual({ ok: true, estado: 'rechazado', version: 2 });
		expect(await estadoDe(t.id)).toMatchObject({
			estado: 'rechazado',
			motivoRechazo: 'No se lee el importe'
		});
		expect((await historialDe(t.id))[0]).toMatchObject({
			accion: 'rechazar',
			motivo: 'No se lee el importe'
		});
	});

	it('rechazar sin motivo suficiente no cambia nada', async () => {
		const { tesorero, t } = await escena();
		for (const motivo of [undefined, '   ', 'Mal', 'x'.repeat(501)]) {
			expect(
				await cambiarEstado(db, tesorero, t.numero, 'rechazar', { version: 1, motivo }, ahora)
			).toEqual({ ok: false, motivo: 'motivo' });
		}
		expect(await estadoDe(t.id)).toMatchObject({ estado: 'pendiente_autorizar', version: 1 });
		expect(await historialDe(t.id)).toEqual([]);
	});

	it('E-04: con una versión antigua se rechaza, aunque el estado aún lo permitiera', async () => {
		const { tesorero, t } = await escena();
		await db.update(ticket).set({ version: 2 }).where(eq(ticket.id, t.id));
		expect(await cambiarEstado(db, tesorero, t.numero, 'autorizar', { version: 1 }, ahora)).toEqual(
			{ ok: false, motivo: 'modificado' }
		);
	});

	it('E-04: dos tesoreros a la vez sobre la misma versión, solo uno gana', async () => {
		const { tesorero, t } = await escena();
		const otro = await crearUsuario(db, { esTesorero: true });
		const resultados = await Promise.all([
			cambiarEstado(db, tesorero, t.numero, 'autorizar', { version: 1 }, ahora),
			cambiarEstado(
				db,
				{ id: otro.id, esTesorero: true },
				t.numero,
				'rechazar',
				{ version: 1, motivo: 'Duplicado' },
				ahora
			)
		]);
		expect(resultados.filter((r) => r.ok)).toHaveLength(1);
		expect(resultados.filter((r) => !r.ok)).toEqual([{ ok: false, motivo: 'modificado' }]);
		expect(await historialDe(t.id)).toHaveLength(1);
	});

	it('con la versión al día pero ya autorizado: «estado»', async () => {
		const { tesorero, socio } = await escena();
		const t = await ticketDe(socio.id, 'pendiente_pago');
		expect(
			await cambiarEstado(
				db,
				tesorero,
				t.numero,
				'rechazar',
				{ version: 1, motivo: 'Tarde ya' },
				ahora
			)
		).toEqual({ ok: false, motivo: 'estado' });
	});

	it('R-04: un tesorero no autoriza su propio ticket', async () => {
		const tesorero = await crearUsuario(db, { esTesorero: true });
		const t = await ticketDe(tesorero.id);
		expect(
			await cambiarEstado(
				db,
				{ id: tesorero.id, esTesorero: true },
				t.numero,
				'autorizar',
				{ version: 1 },
				ahora
			)
		).toEqual({ ok: false, motivo: 'propio' });
	});

	it('R-01: un socio no puede con tickets ajenos (ni sabe que existen) ni autorizar los suyos', async () => {
		const { socio, t } = await escena();
		const otro = await crearUsuario(db);
		expect(
			await cambiarEstado(
				db,
				{ id: otro.id, esTesorero: false },
				t.numero,
				'anular',
				{ version: 1 },
				ahora
			)
		).toEqual({ ok: false, motivo: 'no_encontrado' });
		expect(await cambiarEstado(db, socio, t.numero, 'autorizar', { version: 1 }, ahora)).toEqual({
			ok: false,
			motivo: 'permiso'
		});
		expect(await cambiarEstado(db, socio, 2_000_000_000, 'anular', { version: 1 }, ahora)).toEqual({
			ok: false,
			motivo: 'no_encontrado'
		});
	});

	it('el socio anula el suyo (lo usará HU-S05)', async () => {
		const { socio, t } = await escena();
		expect(await cambiarEstado(db, socio, t.numero, 'anular', { version: 1 }, ahora)).toEqual({
			ok: true,
			estado: 'anulado',
			version: 2
		});
	});
});

describe('detalleParaRevisar (HU-T02)', () => {
	it('cualquier ticket, con el socio, la versión y el historial con sus motivos', async () => {
		const { tesorero, socio, t } = await escena();
		await cambiarEstado(
			db,
			tesorero,
			t.numero,
			'rechazar',
			{ version: 1, motivo: 'Falta la foto' },
			ahora
		);
		const d = await detalleParaRevisar(db, t.numero);
		expect(d).toMatchObject({
			numero: t.numero,
			socioId: socio.id,
			socio: expect.stringMatching(/^Usuario /),
			estado: 'rechazado',
			version: 2,
			historial: [{ accion: 'rechazar', motivo: 'Falta la foto', usuarioId: tesorero.id }]
		});
		expect(await detalleParaRevisar(db, 2_000_000_000)).toBeNull();
	});
});
