// Gestión de conceptos (HU-G04). Un concepto no se borra: se desactiva, y sus tickets lo conservan.
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { claveNombre, concepto, ticket } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';

/** Todos los conceptos en el orden en que los ven los socios, con su número de tickets. */
export async function listarConceptos(conexion: Conexion) {
	return conexion
		.select({
			id: concepto.id,
			nombre: concepto.nombre,
			activo: concepto.activo,
			tickets: count(ticket.id)
		})
		.from(concepto)
		.leftJoin(ticket, eq(ticket.conceptoId, concepto.id))
		.groupBy(concepto.id)
		.orderBy(asc(concepto.orden), asc(concepto.id));
}

export type ConceptoListado = Awaited<ReturnType<typeof listarConceptos>>[number];

const mismoNombre = (nombre: string) =>
	eq(claveNombre(concepto.nombre), claveNombre(sql`${nombre}`));

export type ResultadoCrear = { ok: true; id: number } | { ok: false; motivo: 'duplicado' };

/** Lo añade al final. El índice único (sin mayúsculas) resuelve dos altas simultáneas. */
export async function crearConcepto(conexion: Conexion, nombre: string): Promise<ResultadoCrear> {
	const [fila] = await conexion
		.insert(concepto)
		.values({
			nombre: nombre.trim(),
			orden: sql`(select coalesce(max(${concepto.orden}), 0) + 1 from ${concepto})`
		})
		.onConflictDoNothing()
		.returning({ id: concepto.id });
	return fila ? { ok: true, id: fila.id } : { ok: false, motivo: 'duplicado' };
}

export type ResultadoCambio = { ok: true } | { ok: false; motivo: 'no_existe' };
export type ResultadoRenombrar = ResultadoCambio | { ok: false; motivo: 'duplicado' };

export async function renombrarConcepto(
	conexion: Conexion,
	id: number,
	nombre: string
): Promise<ResultadoRenombrar> {
	const limpio = nombre.trim();
	return conexion.transaction(async (tx) => {
		const [existe] = await tx
			.select({ id: concepto.id })
			.from(concepto)
			.where(eq(concepto.id, id))
			.for('update');
		if (!existe) return { ok: false, motivo: 'no_existe' } as const;

		// Si dos tesoreros eligen el mismo nombre a la vez, el índice único rechaza al segundo.
		const [otro] = await tx
			.select({ id: concepto.id })
			.from(concepto)
			.where(and(mismoNombre(limpio), ne(concepto.id, id)));
		if (otro) return { ok: false, motivo: 'duplicado' } as const;

		await tx.update(concepto).set({ nombre: limpio }).where(eq(concepto.id, id));
		return { ok: true } as const;
	});
}

/**
 * Lo intercambia con su vecino. Renumera toda la lista (1, 2, 3…) para que no queden empates;
 * son pocas filas. En los extremos no hace nada.
 */
export async function moverConcepto(
	conexion: Conexion,
	id: number,
	direccion: 'subir' | 'bajar'
): Promise<ResultadoCambio> {
	return conexion.transaction(async (tx) => {
		const filas = await tx
			.select({ id: concepto.id, orden: concepto.orden })
			.from(concepto)
			.orderBy(asc(concepto.orden), asc(concepto.id))
			.for('update');
		const i = filas.findIndex((f) => f.id === id);
		if (i === -1) return { ok: false, motivo: 'no_existe' } as const;

		const j = direccion === 'subir' ? i - 1 : i + 1;
		if (j >= 0 && j < filas.length) [filas[i], filas[j]] = [filas[j], filas[i]];

		for (const [posicion, fila] of filas.entries()) {
			if (fila.orden !== posicion + 1) {
				await tx
					.update(concepto)
					.set({ orden: posicion + 1 })
					.where(eq(concepto.id, fila.id));
			}
		}
		return { ok: true } as const;
	});
}

/** Desactivado, deja de ofrecerse al enviar tickets; los que ya lo usan lo conservan. */
export async function cambiarActivo(
	conexion: Conexion,
	id: number,
	activo: boolean
): Promise<ResultadoCambio> {
	const filas = await conexion
		.update(concepto)
		.set({ activo })
		.where(eq(concepto.id, id))
		.returning({ id: concepto.id });
	return filas.length ? { ok: true } : { ok: false, motivo: 'no_existe' };
}
