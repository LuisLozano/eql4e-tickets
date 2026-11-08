// Purga de tickets antiguos (HU-G05, RNF-22): pasados 18 meses desde la fecha de compra, los tickets
// ya cerrados (pagados, rechazados o anulados) se eliminan del todo, con sus ficheros e historial. Los
// pendientes no se tocan: el tesorero los ve en un aviso para que los resuelva.
import { and, count, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { historial, pago, ticket, ticketFichero } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';

export const MESES_CONSERVACION = 18;

const CERRADOS = ['pagado', 'rechazado', 'anulado'] as const;
const PENDIENTES = ['pendiente_autorizar', 'pendiente_pago'] as const;

/**
 * «2026-11-08» → «2025-05-08»: lo comprado antes de ese día tiene más de 18 meses. Si el mes de
 * destino es más corto, el último día del mes («2026-08-31» → «2025-02-28»).
 */
export function fechaLimite(hoy: string): string {
	const [anio, mes, dia] = hoy.split('-').map(Number);
	const meses = anio * 12 + (mes - 1) - MESES_CONSERVACION;
	const a = Math.floor(meses / 12);
	const m = (meses % 12) + 1;
	const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
	const d = Math.min(dia, ultimo);
	return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** El día anterior: lo que se pone en «hasta» (que incluye ese día) para ver lo anterior al límite. */
export function diaAnterior(fecha: string): string {
	const d = new Date(`${fecha}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

export type ResultadoPurga = {
	tickets: number;
	pagos: number;
	/** Rutas de los ficheros que hay que borrar del disco después del COMMIT. */
	ficheros: string[];
};

/**
 * Elimina en la transacción recibida los tickets cerrados con más de 18 meses y los pagos que se
 * quedan sin nada que los nombre. Los ficheros se borran del disco después, cuando la transacción
 * ya está confirmada: si se deshiciera, no se habría perdido ninguno.
 */
export async function purgar(conexion: Conexion, hoy: string): Promise<ResultadoPurga> {
	const viejos = await conexion
		.select({ id: ticket.id, pagoId: ticket.pagoId })
		.from(ticket)
		.where(and(inArray(ticket.estado, [...CERRADOS]), lt(ticket.fechaCompra, fechaLimite(hoy))))
		.for('update');
	if (viejos.length === 0) return { tickets: 0, pagos: 0, ficheros: [] };
	const ids = viejos.map((t) => t.id);

	// Los pagos que pueden quedarse vacíos: el de cada ticket y los que nombra su historial (un pago
	// deshecho ya no está en el ticket, pero sí en el historial).
	const enHistorial = await conexion
		.selectDistinct({ pagoId: historial.pagoId })
		.from(historial)
		.where(and(inArray(historial.ticketId, ids), isNotNull(historial.pagoId)));
	const candidatos = [
		...new Set([...viejos, ...enHistorial].map((f) => f.pagoId).filter((p) => p !== null))
	];

	// Todos sus ficheros, también los sustituidos al editar (02-modelo-datos.md).
	const ficheros = await conexion
		.select({ ruta: ticketFichero.ruta })
		.from(ticketFichero)
		.where(inArray(ticketFichero.ticketId, ids));

	// En cascada: ticket_fichero e historial.
	await conexion.delete(ticket).where(inArray(ticket.id, ids));

	// «"pago"."id"» con la tabla: en un DELETE, Drizzle no la pone, y en la subconsulta «id» sería el
	// del ticket o el del historial.
	const pagos = candidatos.length
		? await conexion
				.delete(pago)
				.where(
					and(
						inArray(pago.id, candidatos),
						sql`not exists (select 1 from ${ticket} where ${ticket.pagoId} = "pago"."id")`,
						sql`not exists (select 1 from ${historial} where ${historial.pagoId} = "pago"."id")`
					)
				)
				.returning({ justificante: pago.justificanteRuta })
		: [];

	return {
		tickets: ids.length,
		pagos: pagos.length,
		ficheros: [
			...ficheros.map((f) => f.ruta),
			...pagos.flatMap((p) => (p.justificante ? [p.justificante] : []))
		]
	};
}

/** Pendientes con más de 18 meses: la purga no los borra y el tesorero tiene que resolverlos. */
export async function pendientesAntiguos(conexion: Conexion, hoy: string) {
	const limite = fechaLimite(hoy);
	const [fila] = await conexion
		.select({ cantidad: count() })
		.from(ticket)
		.where(and(inArray(ticket.estado, [...PENDIENTES]), lt(ticket.fechaCompra, limite)));
	return { cantidad: fila.cantidad, hasta: diaAnterior(limite) };
}
