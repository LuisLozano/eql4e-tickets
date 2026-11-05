// Fábrica de conexiones. No lee variables de entorno: quien la llama pasa la URL
// (la app en `app.ts`, los scripts y las pruebas de integración con la suya).
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as esquema from './esquema.ts';

export function crearConexion(url: string, opciones: { max?: number } = {}) {
	const sql = postgres(url, { max: opciones.max ?? 10, onnotice: () => {} });
	const db = drizzle(sql, { schema: esquema, casing: 'snake_case' });
	return { sql, db };
}
