import postgres from 'postgres';
import { afterAll, describe, expect, inject, it } from 'vitest';

const sql = postgres(inject('databaseUrl'), { max: 1 });

afterAll(() => sql.end());

describe('base de datos de pruebas', () => {
	it('responde y es PostgreSQL 18', async () => {
		const [fila] = await sql`show server_version_num`;
		expect(Number(fila.server_version_num)).toBeGreaterThanOrEqual(180000);
	});
});
