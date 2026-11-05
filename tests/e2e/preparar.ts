// Antes de las pruebas e2e: migraciones y un socio invitado por perfil (móvil y escritorio),
// con un código de activación conocido. Escribe en la base directamente, sin pasar por la app.
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { migrar } from '../../scripts/migrar.js';
import { SOCIOS } from './datos.ts';

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

export default async function preparar() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('Las pruebas e2e necesitan DATABASE_URL');
	await migrar(url);

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		for (const socio of Object.values(SOCIOS)) {
			await sql`delete from usuario where telefono = ${socio.telefono}`;
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email)
				values (${socio.nombre}, ${socio.telefono}, ${socio.email})
				returning id`;
			await sql`
				insert into codigo_acceso (usuario_id, codigo_hash, tipo, caduca_en)
				values (${id}, ${sha256(socio.codigo.replaceAll('-', ''))}, 'activacion', now() + interval '1 day')`;
		}
	} finally {
		await sql.end();
	}
}
