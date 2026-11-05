import { json } from '@sveltejs/kit';
import { sql } from '#lib/server/infra/db/app.ts';
import type { RequestHandler } from './$types';

/** Comprobación de salud para Docker y el despliegue (RNF-34). */
export const GET: RequestHandler = async () => {
	try {
		await sql`select 1`;
		return json({ estado: 'ok' }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return json(
			{ estado: 'error', detalle: 'base de datos no disponible' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
