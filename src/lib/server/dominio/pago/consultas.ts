// Lo que ve el tesorero de los pagos (HU-T05) y el acceso a los justificantes (RNF-13).
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { concepto, historial, pago, ticket, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { puedeVerTicket, type Lector } from '../ticket/permisos.ts';

const nombreConcepto = sql<string>`coalesce(${concepto.nombre}, ${ticket.conceptoOtro})`;

/**
 * Los tickets de un pago salen del historial, no de `ticket.pago_id`: al deshacer el pago
 * (E-03) los tickets dejan de apuntarle, pero el pago sigue siendo de ellos.
 */
const ticketsDelPago = (pagoId: unknown) =>
	sql`select ${historial.ticketId} from ${historial} where ${historial.accion} = 'pagar' and ${historial.pagoId} = ${pagoId}`;

/**
 * Los socios a los que se debe dinero: cuántos tickets pendientes de pago tienen y cuánto suman.
 * Sin los del propio tesorero, que tiene que pagarlos otro (R-04).
 */
export async function porPagar(conexion: Conexion, yo: string) {
	return conexion
		.select({
			socioId: usuario.id,
			socio: usuario.nombre,
			tickets: count(),
			totalCentimos: sql<number>`sum(${ticket.importeCentimos})`.mapWith(Number)
		})
		.from(ticket)
		.innerJoin(usuario, eq(usuario.id, ticket.socioId))
		.where(and(eq(ticket.estado, 'pendiente_pago'), ne(ticket.socioId, yo)))
		.groupBy(usuario.id, usuario.nombre)
		.orderBy(asc(usuario.nombre));
}

/**
 * El socio, con su IBAN para la transferencia (HU-S07), y sus tickets pendientes de pago, lo más
 * antiguo primero. Nulo si no existe.
 */
export async function pendientesDeSocio(conexion: Conexion, socioId: string) {
	const [socio] = await conexion
		.select({
			id: usuario.id,
			nombre: usuario.nombre,
			telefono: usuario.telefono,
			iban: usuario.iban
		})
		.from(usuario)
		.where(eq(usuario.id, socioId));
	if (!socio) return null;
	const tickets = await conexion
		.select({
			numero: ticket.numero,
			version: ticket.version,
			fechaCompra: ticket.fechaCompra,
			concepto: nombreConcepto,
			importeCentimos: ticket.importeCentimos
		})
		.from(ticket)
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(and(eq(ticket.socioId, socioId), eq(ticket.estado, 'pendiente_pago')))
		.orderBy(asc(ticket.fechaCompra), asc(ticket.numero));
	return { ...socio, tickets };
}

/** Los últimos pagos registrados, también los deshechos. */
export async function ultimosPagos(conexion: Conexion, limite = 20) {
	return conexion
		.select({
			id: pago.id,
			fechaPago: pago.fechaPago,
			metodo: pago.metodo,
			importeTotalCentimos: pago.importeTotalCentimos,
			socio: usuario.nombre,
			tickets:
				sql<number>`(select count(distinct t) from (${ticketsDelPago(pago.id)}) as p(t))`.mapWith(
					Number
				),
			anulado: sql<boolean>`${pago.anuladoEn} is not null`
		})
		.from(pago)
		.innerJoin(usuario, eq(usuario.id, pago.socioId))
		.orderBy(desc(pago.creadoEn))
		.limit(limite);
}

/** Un pago con sus tickets y quién lo registró. Nulo si no existe. */
export async function detallePago(conexion: Conexion, id: string) {
	const registrador = sql<string>`(select ${usuario.nombre} from ${usuario} where ${usuario.id} = ${pago.registradoPor})`;
	const [p] = await conexion
		.select({
			id: pago.id,
			socioId: pago.socioId,
			socio: usuario.nombre,
			fechaPago: pago.fechaPago,
			metodo: pago.metodo,
			importeTotalCentimos: pago.importeTotalCentimos,
			conJustificante: sql<boolean>`${pago.justificanteRuta} is not null`,
			registradoPor: registrador,
			creadoEn: pago.creadoEn,
			anuladoEn: pago.anuladoEn,
			motivoAnulacion: pago.motivoAnulacion
		})
		.from(pago)
		.innerJoin(usuario, eq(usuario.id, pago.socioId))
		.where(eq(pago.id, id));
	if (!p) return null;
	const tickets = await conexion
		.select({
			numero: ticket.numero,
			fechaCompra: ticket.fechaCompra,
			concepto: nombreConcepto,
			importeCentimos: ticket.importeCentimos,
			estado: ticket.estado
		})
		.from(ticket)
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(sql`${ticket.id} in (${ticketsDelPago(id)})`)
		.orderBy(asc(ticket.fechaCompra), asc(ticket.numero));
	return { ...p, tickets };
}

/** El justificante, si quien lo pide es el socio del pago o un tesorero (R-01). Nulo si no. */
export async function justificanteVisible(conexion: Conexion, lector: Lector, pagoId: string) {
	const [p] = await conexion
		.select({
			ruta: pago.justificanteRuta,
			tipoMime: pago.justificanteMime,
			fechaPago: pago.fechaPago,
			socioId: pago.socioId
		})
		.from(pago)
		.where(eq(pago.id, pagoId));
	if (!p?.ruta || !p.tipoMime || !puedeVerTicket(lector, p)) return null;
	return { ruta: p.ruta, tipoMime: p.tipoMime, fechaPago: p.fechaPago };
}
