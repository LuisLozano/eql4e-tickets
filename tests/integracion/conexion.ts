// Conexión de las pruebas de integración: la base de datos temporal que prepara `preparar.ts`.
import { afterAll, inject } from 'vitest';
import { crearConexion } from '../../src/lib/server/infra/db/cliente.ts';

export function conexionDePrueba() {
	const conexion = crearConexion(inject('databaseUrl'), { max: 2 });
	afterAll(() => conexion.sql.end());
	return conexion;
}
