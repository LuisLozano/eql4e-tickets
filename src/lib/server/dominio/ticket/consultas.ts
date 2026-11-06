// Lo que ve el socio de sus tickets (HU-S02, HU-S03), el detalle para revisar (HU-T02) y el acceso
// a los ficheros (RNF-13).
import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import type { EstadoTicket } from '#lib/estados.ts';
import {
	concepto,
	historial,
	pago,
	ticket,
	ticketFichero,
	usuario
} from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import { puedeVerTicket, type Lector } from './permisos.ts';

/** Los filtros de «Mis tickets», como en el boceto: «Pendientes» agrupa los dos estados pendientes. */
export const FILTROS = {
	pendientes: ['pendiente_autorizar', 'pendiente_pago'],
	rechazado: ['rechazado'],
	pagado: ['pagado'],
	anulado: ['anulado']
} as const satisfies Record<string, readonly EstadoTicket[]>;

export type Filtro = keyof typeof FILTROS;

export const esFiltro = (valor: string | null): valor is Filtro =>
	valor !== null && Object.hasOwn(FILTROS, valor);

/** El nombre del concepto, o el texto libre de «Otro». */
const nombreConcepto = sql<string>`coalesce(${concepto.nombre}, ${ticket.conceptoOtro})`;

/** Los tickets del socio, lo más reciente primero. */
export async function misTickets(conexion: Conexion, socioId: string, filtro?: Filtro) {
	return conexion
		.select({
			numero: ticket.numero,
			importeCentimos: ticket.importeCentimos,
			fechaCompra: ticket.fechaCompra,
			concepto: nombreConcepto,
			estado: ticket.estado,
			motivoRechazo: ticket.motivoRechazo
		})
		.from(ticket)
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(
			and(
				eq(ticket.socioId, socioId),
				filtro ? inArray(ticket.estado, [...FILTROS[filtro]]) : undefined
			)
		)
		.orderBy(desc(ticket.creadoEn), desc(ticket.numero));
}

export type TicketListado = Awaited<ReturnType<typeof misTickets>>[number];

const suma = (condicion: ReturnType<typeof sql>) =>
	sql<number>`coalesce(sum(${ticket.importeCentimos}) filter (where ${condicion}), 0)`.mapWith(
		Number
	);

/** Por autorizar, por cobrar y cobrado en el año dado (por la fecha del pago), en céntimos. */
export async function totalesSocio(conexion: Conexion, socioId: string, anio: number) {
	const [totales] = await conexion
		.select({
			porAutorizar: suma(sql`${ticket.estado} = 'pendiente_autorizar'`),
			porCobrar: suma(sql`${ticket.estado} = 'pendiente_pago'`),
			cobrado: suma(
				sql`${ticket.estado} = 'pagado' and extract(year from ${pago.fechaPago}) = ${anio}`
			)
		})
		.from(ticket)
		.leftJoin(pago, eq(pago.id, ticket.pagoId))
		.where(eq(ticket.socioId, socioId));
	return totales;
}

/** El detalle de un ticket, con sus ficheros vigentes y el historial (lo último primero). */
async function detalle(conexion: Conexion, donde: SQL | undefined) {
	const [t] = await conexion
		.select({
			id: ticket.id,
			numero: ticket.numero,
			socioId: ticket.socioId,
			socio: usuario.nombre,
			importeCentimos: ticket.importeCentimos,
			fechaCompra: ticket.fechaCompra,
			concepto: nombreConcepto,
			observaciones: ticket.observaciones,
			estado: ticket.estado,
			motivoRechazo: ticket.motivoRechazo,
			version: ticket.version
		})
		.from(ticket)
		.innerJoin(usuario, eq(usuario.id, ticket.socioId))
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(donde);
	if (!t) return null;

	const [ficheros, entradas] = await Promise.all([
		conexion
			.select({
				id: ticketFichero.id,
				nombreOriginal: ticketFichero.nombreOriginal,
				tipoMime: ticketFichero.tipoMime
			})
			.from(ticketFichero)
			.where(and(eq(ticketFichero.ticketId, t.id), isNull(ticketFichero.sustituidoEn)))
			.orderBy(asc(ticketFichero.orden)),
		conexion
			.select({
				accion: historial.accion,
				motivo: historial.motivo,
				creadoEn: historial.creadoEn,
				usuarioId: historial.usuarioId,
				nombre: usuario.nombre
			})
			.from(historial)
			.innerJoin(usuario, eq(usuario.id, historial.usuarioId))
			.where(eq(historial.ticketId, t.id))
			.orderBy(desc(historial.creadoEn), desc(historial.id))
	]);
	return { ...t, ficheros, historial: entradas };
}

/**
 * El detalle de un ticket del socio. Nulo si no existe o es de otro: en la zona del socio, ni un
 * tesorero ve los ajenos (R-01).
 */
export function detalleTicket(conexion: Conexion, socioId: string, numero: number) {
	return detalle(conexion, and(eq(ticket.numero, numero), eq(ticket.socioId, socioId)));
}

/** El detalle de cualquier ticket, para revisarlo (HU-T02). La ruta ya exige ser tesorero. */
export function detalleParaRevisar(conexion: Conexion, numero: number) {
	return detalle(conexion, eq(ticket.numero, numero));
}

export type DetalleTicket = NonNullable<Awaited<ReturnType<typeof detalleTicket>>>;

/** El fichero, si quien lo pide puede ver su ticket (R-01). Nulo en otro caso: la ruta responde 404. */
export async function ficheroVisible(conexion: Conexion, lector: Lector, id: string) {
	const [f] = await conexion
		.select({
			ruta: ticketFichero.ruta,
			nombreOriginal: ticketFichero.nombreOriginal,
			tipoMime: ticketFichero.tipoMime,
			socioId: ticket.socioId
		})
		.from(ticketFichero)
		.innerJoin(ticket, eq(ticket.id, ticketFichero.ticketId))
		.where(eq(ticketFichero.id, id));
	return f && puedeVerTicket(lector, f) ? f : null;
}
