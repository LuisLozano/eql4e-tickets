import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { EstadoTicket } from '../../src/lib/estados.ts';
import { pendientesAntiguos, purgar } from '../../src/lib/server/dominio/purga/purga.ts';
import { historial, pago, ticket, ticketFichero } from '../../src/lib/server/infra/db/esquema.ts';
import type { Conexion } from '../../src/lib/server/infra/db/tipos.ts';
import { conexionDePrueba } from './conexion.ts';
import { crearUsuario } from './datos.ts';

const { db } = conexionDePrueba();
// Fechas de 2019 a 2021: ningún otro fichero de pruebas usa compras tan antiguas, así que la purga
// solo encuentra las de aquí. Aun así, todo va en una transacción que se deshace.
const HOY = '2021-06-15'; // límite: 2019-12-15
const ruta = (nombre: string) => `2019/06/${crypto.randomUUID()}-${nombre}`;

class Deshacer extends Error {}
async function sinGuardar(prueba: (tx: Conexion) => Promise<void>) {
	await expect(
		db.transaction(async (tx) => {
			await prueba(tx);
			throw new Deshacer();
		})
	).rejects.toBeInstanceOf(Deshacer);
}

async function escena(tx: Conexion) {
	const socio = await crearUsuario(tx);
	const tesorero = await crearUsuario(tx, { esTesorero: true, esSocio: false });

	const nuevoPago = async (justificante?: string) =>
		(
			await tx
				.insert(pago)
				.values({
					socioId: socio.id,
					fechaPago: '2019-07-01',
					metodo: 'bizum',
					importeTotalCentimos: 100,
					justificanteRuta: justificante ?? null,
					justificanteMime: justificante ? 'application/pdf' : null,
					registradoPor: tesorero.id
				})
				.returning()
		)[0].id;
	const nuevoTicket = async (
		estado: EstadoTicket,
		fechaCompra: string,
		pagoId: string | null = null
	) =>
		(
			await tx
				.insert(ticket)
				.values({
					socioId: socio.id,
					estado,
					fechaCompra,
					importeCentimos: 100,
					conceptoOtro: 'Purga',
					motivoRechazo: estado === 'rechazado' ? 'No se lee' : null,
					pagoId
				})
				.returning()
		)[0].id;
	const enHistorial = (ticketId: string, pagoId: string) =>
		tx.insert(historial).values({
			ticketId,
			usuarioId: tesorero.id,
			accion: 'pagar',
			estadoOrigen: 'pendiente_pago',
			estadoDestino: 'pagado',
			pagoId
		});

	const justificante = ruta('justificante.pdf');
	const pagoSolo = await nuevoPago(justificante);
	const pagado = await nuevoTicket('pagado', '2019-06-01', pagoSolo);
	await enHistorial(pagado, pagoSolo);
	const foto = ruta('foto.webp');
	const sustituida = ruta('sustituida.webp');
	await tx.insert(ticketFichero).values([
		{
			ticketId: pagado,
			ruta: foto,
			nombreOriginal: 'f',
			tipoMime: 'image/webp',
			tamanoBytes: 1,
			orden: 1
		},
		{
			ticketId: pagado,
			ruta: sustituida,
			nombreOriginal: 's',
			tipoMime: 'image/webp',
			tamanoBytes: 1,
			orden: 2,
			sustituidoEn: new Date('2019-06-02T10:00:00Z'),
			sustituidoPor: socio.id
		}
	]);

	const rechazado = await nuevoTicket('rechazado', '2019-06-01');
	const enElLimite = await nuevoTicket('anulado', '2019-12-15');
	const pendiente = await nuevoTicket('pendiente_pago', '2019-01-01');

	// Un pago agrupado con un ticket viejo y otro reciente: el pago se queda.
	const pagoMixto = await nuevoPago();
	const viejoDelMixto = await nuevoTicket('pagado', '2019-06-01', pagoMixto);
	const recienteDelMixto = await nuevoTicket('pagado', '2020-06-01', pagoMixto);

	// Un pago deshecho (sin tickets, solo en el historial). Si lo nombra el historial de un ticket que
	// se queda, se conserva; si solo lo nombraba uno que se purga, se elimina.
	const deshechoQueSigue = await nuevoPago();
	await enHistorial(await nuevoTicket('anulado', '2019-06-01'), deshechoQueSigue);
	await enHistorial(await nuevoTicket('pendiente_pago', '2021-01-01'), deshechoQueSigue);
	const deshechoQueSeVa = await nuevoPago();
	await enHistorial(await nuevoTicket('anulado', '2019-06-01'), deshechoQueSeVa);

	return {
		ficheros: { foto, sustituida, justificante },
		tickets: { pagado, rechazado, enElLimite, pendiente, viejoDelMixto, recienteDelMixto },
		pagos: { pagoSolo, pagoMixto, deshechoQueSigue, deshechoQueSeVa }
	};
}

describe('purga de tickets antiguos (HU-G05)', () => {
	it('elimina los cerrados con más de 18 meses, sus ficheros e historial y los pagos vacíos', () =>
		sinGuardar(async (tx) => {
			const { ficheros, tickets, pagos } = await escena(tx);

			const r = await purgar(tx, HOY);
			// El pagado, el rechazado, el viejo del pago mixto y los dos anulados con pago deshecho.
			expect(r.tickets).toBe(5);
			expect(r.pagos).toBe(2);
			expect(r.ficheros.sort()).toEqual(
				[ficheros.foto, ficheros.sustituida, ficheros.justificante].sort()
			);

			const quedan = await tx
				.select({ id: ticket.id })
				.from(ticket)
				.where(inArray(ticket.id, Object.values(tickets)));
			expect(quedan.map((t) => t.id).sort()).toEqual(
				[tickets.enElLimite, tickets.pendiente, tickets.recienteDelMixto].sort()
			);
			expect(
				await tx.select().from(ticketFichero).where(eq(ticketFichero.ticketId, tickets.pagado))
			).toEqual([]);
			expect(
				await tx.select().from(historial).where(eq(historial.ticketId, tickets.pagado))
			).toEqual([]);
			const pagosQueQuedan = await tx
				.select({ id: pago.id })
				.from(pago)
				.where(inArray(pago.id, Object.values(pagos)));
			expect(pagosQueQuedan.map((p) => p.id).sort()).toEqual(
				[pagos.pagoMixto, pagos.deshechoQueSigue].sort()
			);

			// Otra vez el mismo día: ya no hay nada.
			expect(await purgar(tx, HOY)).toEqual({ tickets: 0, pagos: 0, ficheros: [] });
		}));

	it('cuenta los pendientes con más de 18 meses, que no se borran', () =>
		sinGuardar(async (tx) => {
			const antes = await pendientesAntiguos(tx, HOY);
			await escena(tx);
			const despues = await pendientesAntiguos(tx, HOY);
			expect(despues).toEqual({ cantidad: antes.cantidad + 1, hasta: '2019-12-14' });
		}));
});
