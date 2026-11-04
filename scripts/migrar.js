// Aplica las migraciones SQL de ./drizzle antes de arrancar la app (ADR-0006).
// Se ejecuta en el entrypoint del contenedor y en las pruebas de integración.
import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * @param {string} url
 * @param {string} [carpeta]
 */
export async function migrar(url, carpeta = './drizzle') {
	if (!existsSync(`${carpeta}/meta/_journal.json`)) {
		console.log('[migrar] No hay migraciones todavía.');
		return;
	}
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(sql), { migrationsFolder: carpeta });
		console.log('[migrar] Migraciones aplicadas.');
	} finally {
		await sql.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	if (!process.env.DATABASE_URL) {
		console.error('[migrar] Falta DATABASE_URL');
		process.exit(1);
	}
	migrar(process.env.DATABASE_URL).catch((error) => {
		console.error('[migrar] Error:', error);
		process.exit(1);
	});
}
