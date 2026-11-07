import { describe, expect, it } from 'vitest';
import type { Conexion } from './db/tipos.ts';
import { programar } from './tareas.ts';

// Al programar no se toca la base de datos: solo al ejecutarse.
const sinConexion = {} as Conexion;
const nada = async () => null;

describe('programar', () => {
	it('lanza la tarea a la hora de Madrid', () => {
		const cron = programar(sinConexion, 'prueba-hora', '0 0 19 * * *', nada, () => {});
		try {
			// 7 de noviembre: Madrid está en UTC+1, así que las 19:00 son las 18:00 UTC.
			expect(cron.nextRun(new Date('2026-11-07T12:00:00Z'))).toEqual(
				new Date('2026-11-07T18:00:00Z')
			);
			// En verano, UTC+2.
			expect(cron.nextRun(new Date('2026-07-01T12:00:00Z'))).toEqual(
				new Date('2026-07-01T17:00:00Z')
			);
		} finally {
			cron.stop();
		}
	});

	it('programar otra vez con el mismo nombre sustituye la anterior', () => {
		const primera = programar(sinConexion, 'prueba-doble', '0 0 19 * * *', nada, () => {});
		const segunda = programar(sinConexion, 'prueba-doble', '0 0 19 * * *', nada, () => {});
		try {
			expect(primera.isStopped()).toBe(true);
			expect(segunda.isStopped()).toBe(false);
		} finally {
			segunda.stop();
		}
	});
});
