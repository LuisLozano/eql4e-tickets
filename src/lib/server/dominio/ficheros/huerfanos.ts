// Ficheros huérfanos: los que están en el disco pero no los nombra ningún ticket ni pago. Salen si la
// app se para entre guardar un fichero y confirmar la transacción que lo registra (crear.ts guarda
// primero los ficheros). Los sustituidos al editar y los justificantes de pagos deshechos siguen
// en la base de datos, así que no son huérfanos.
import { isNotNull } from 'drizzle-orm';
import { pago, ticketFichero } from '#lib/server/infra/db/esquema.ts';
import type { Conexion } from '#lib/server/infra/db/tipos.ts';
import type { Almacen } from '../ticket/crear.ts';

export type FicheroGuardado = { ruta: string; modificadoEn: Date };

/** Un almacén que además sabe decir qué ficheros tiene. */
export interface AlmacenListable extends Almacen {
	/** Todos los ficheros, con la ruta con «/» como la guarda la base de datos. */
	listar(): Promise<FicheroGuardado[]>;
}

/** Uno más reciente puede ser de una subida en curso, cuya transacción aún no ha terminado. */
export const GRACIA_MS = 24 * 60 * 60 * 1000;
/**
 * Si salen más, algo va mal (una base de datos restaurada sin sus ficheros, otra ruta de
 * ficheros…): no se borra nada y se avisa en el log para revisarlo a mano.
 */
export const MAX_BORRADOS = 50;

export type ResultadoHuerfanos =
	| { ok: true; revisados: number; borrados: string[] }
	| { ok: false; motivo: 'demasiados'; revisados: number; huerfanos: number };

export async function limpiarHuerfanos(
	conexion: Conexion,
	almacen: AlmacenListable,
	ahora: Date
): Promise<ResultadoHuerfanos> {
	// Primero el disco y después la base de datos: un fichero que se registre entre las dos lecturas
	// ya sale como usado.
	const enDisco = await almacen.listar();
	const [deTickets, justificantes] = await Promise.all([
		conexion.select({ ruta: ticketFichero.ruta }).from(ticketFichero),
		conexion
			.select({ ruta: pago.justificanteRuta })
			.from(pago)
			.where(isNotNull(pago.justificanteRuta))
	]);
	const usados = new Set([...deTickets, ...justificantes].map((f) => f.ruta));

	const huerfanos = enDisco.filter(
		(f) => !usados.has(f.ruta) && ahora.getTime() - f.modificadoEn.getTime() > GRACIA_MS
	);
	if (huerfanos.length > MAX_BORRADOS) {
		return {
			ok: false,
			motivo: 'demasiados',
			revisados: enDisco.length,
			huerfanos: huerfanos.length
		};
	}
	for (const f of huerfanos) await almacen.borrar(f.ruta);
	return { ok: true, revisados: enDisco.length, borrados: huerfanos.map((f) => f.ruta) };
}
