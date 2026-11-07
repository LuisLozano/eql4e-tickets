// Tareas programadas dentro de la app (ADR-0006): croner las lanza a su hora (de Madrid) y un
// advisory lock de PostgreSQL evita que se ejecuten dos a la vez, por ejemplo con dos contenedores
// durante un despliegue.
import { Cron } from 'croner';
import { sql } from 'drizzle-orm';
import type { Conexion } from './db/tipos.ts';

export type ResultadoExclusiva<T> = { ok: true; resultado: T } | { ok: false; motivo: 'ocupada' };

/**
 * Ejecuta la tarea dentro de una transacción con un bloqueo por nombre. Si otro ya la está
 * ejecutando, no espera: devuelve «ocupada». El bloqueo se suelta solo al terminar la transacción.
 */
export async function ejecutarEnExclusiva<T>(
	conexion: Conexion,
	nombre: string,
	tarea: (tx: Conexion) => Promise<T>
): Promise<ResultadoExclusiva<T>> {
	return conexion.transaction(async (tx) => {
		const [fila] = await tx.execute<{ libre: boolean }>(
			sql`select pg_try_advisory_xact_lock(hashtext(${`eql4e:${nombre}`})) as libre`
		);
		if (!fila.libre) return { ok: false, motivo: 'ocupada' } as const;
		return { ok: true, resultado: await tarea(tx) } as const;
	});
}

const programadas = new Map<string, Cron>();

/**
 * Programa la tarea con un patrón de croner (con segundos: «0 0 19 * * *» es cada día a las 19:00).
 * Si ya había una con ese nombre (el servidor de desarrollo recarga los hooks), la sustituye. Un
 * error se registra en el log y no para las siguientes ejecuciones.
 */
export function programar<T>(
	conexion: Conexion,
	nombre: string,
	patron: string,
	tarea: (tx: Conexion) => Promise<T>,
	alTerminar: (resultado: ResultadoExclusiva<T>) => void
) {
	programadas.get(nombre)?.stop();
	const cron = new Cron(
		patron,
		{ name: nombre, timezone: 'Europe/Madrid', protect: true },
		async () => {
			try {
				alTerminar(await ejecutarEnExclusiva(conexion, nombre, tarea));
			} catch (e) {
				console.error(`[tareas] ${nombre}: error`, e);
			}
		}
	);
	programadas.set(nombre, cron);
	return cron;
}
