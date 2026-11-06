// Listado global del tesorero (HU-T01). La ruta ya exige ser tesorero (hooks.server.ts): aquí no hay
// datos que filtrar por permiso, todos los tickets son visibles para él.
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import type { EstadoTicket } from '#lib/estados.ts';
import { TAMANO_PAGINA, type FiltrosListado, type Orden } from '#lib/listado-tickets.ts';
import { claveNombre, concepto, ticket, usuario } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';

/** Lo que requiere acción primero (HU-T01). */
export const ORDEN_ESTADOS = [
	'pendiente_autorizar',
	'pendiente_pago',
	'rechazado',
	'pagado',
	'anulado'
] as const satisfies readonly EstadoTicket[];

const posicionEstado = sql`array_position(array[${sql.join(
	ORDEN_ESTADOS.map((e) => sql`${e}`),
	sql`, `
)}]::estado_ticket[], ${ticket.estado})`;

const COLUMNA: Record<Orden, SQL> = {
	estado: posicionEstado,
	compra: sql`${ticket.fechaCompra}`,
	socio: claveNombre(usuario.nombre),
	concepto: claveNombre(sql`coalesce(${concepto.nombre}, ${ticket.conceptoOtro})`),
	importe: sql`${ticket.importeCentimos}`,
	enviado: sql`${ticket.creadoEn}`
};

function condiciones(f: FiltrosListado) {
	return and(
		f.estados.length ? inArray(ticket.estado, f.estados) : undefined,
		f.concepto === 'otro'
			? isNull(ticket.conceptoId)
			: f.concepto !== null
				? eq(ticket.conceptoId, f.concepto)
				: undefined,
		f.socio ? eq(ticket.socioId, f.socio) : undefined,
		f.desde ? gte(ticket.fechaCompra, f.desde) : undefined,
		f.hasta ? lte(ticket.fechaCompra, f.hasta) : undefined,
		f.min !== null ? gte(ticket.importeCentimos, f.min) : undefined,
		f.max !== null ? lte(ticket.importeCentimos, f.max) : undefined
	);
}

export type TotalEstado = { estado: EstadoTicket; tickets: number; centimos: number };

/**
 * Una página del listado y los totales de todo el resultado filtrado, por estado (en el orden de
 * ORDEN_ESTADOS, solo los que tienen tickets). Una página fuera de rango se lleva a la última.
 */
export async function listadoGlobal(conexion: Conexion, f: FiltrosListado) {
	const donde = condiciones(f);

	const filasTotales = await conexion
		.select({
			estado: ticket.estado,
			tickets: count(),
			centimos: sql<number>`coalesce(sum(${ticket.importeCentimos}), 0)`.mapWith(Number)
		})
		.from(ticket)
		.where(donde)
		.groupBy(ticket.estado);
	const porEstado: TotalEstado[] = ORDEN_ESTADOS.flatMap(
		(e) => filasTotales.find((t) => t.estado === e) ?? []
	);
	const total = {
		tickets: porEstado.reduce((s, t) => s + t.tickets, 0),
		centimos: porEstado.reduce((s, t) => s + t.centimos, 0)
	};
	const paginas = Math.max(1, Math.ceil(total.tickets / TAMANO_PAGINA));
	const pagina = Math.min(f.pagina, paginas);

	const sentido = f.dir === 'desc' ? desc : asc;
	const filas = await conexion
		.select({
			numero: ticket.numero,
			estado: ticket.estado,
			fechaCompra: ticket.fechaCompra,
			socioId: ticket.socioId,
			socio: usuario.nombre,
			socioDeBaja: sql<boolean>`${usuario.estado} = 'baja'`,
			concepto: concepto.nombre,
			conceptoOtro: ticket.conceptoOtro,
			importeCentimos: ticket.importeCentimos,
			creadoEn: ticket.creadoEn
		})
		.from(ticket)
		.innerJoin(usuario, eq(usuario.id, ticket.socioId))
		.leftJoin(concepto, eq(concepto.id, ticket.conceptoId))
		.where(donde)
		// Dentro de cada valor, lo más antiguo primero; el número desempata del todo.
		.orderBy(sentido(COLUMNA[f.orden]), asc(ticket.creadoEn), asc(ticket.numero))
		.limit(TAMANO_PAGINA)
		.offset((pagina - 1) * TAMANO_PAGINA);

	return { filas, porEstado, total, pagina, paginas };
}

export type FilaListado = Awaited<ReturnType<typeof listadoGlobal>>['filas'][number];

/** Las opciones de los desplegables: todos los conceptos (también inactivos) y los socios con tickets. */
export async function opcionesListado(conexion: Conexion) {
	const [conceptos, socios] = await Promise.all([
		conexion
			.select({ id: concepto.id, nombre: concepto.nombre, activo: concepto.activo })
			.from(concepto)
			.orderBy(asc(concepto.orden)),
		conexion
			.select({
				id: usuario.id,
				nombre: usuario.nombre,
				deBaja: sql<boolean>`${usuario.estado} = 'baja'`
			})
			.from(usuario)
			.where(inArray(usuario.id, conexion.select({ id: ticket.socioId }).from(ticket)))
			.orderBy(claveNombre(usuario.nombre))
	]);
	return { conceptos, socios };
}
