// Antes de las pruebas e2e: migraciones y, por perfil (móvil y escritorio), un socio invitado con
// un código de activación conocido y un tesorero activo con contraseña conocida. Escribe en la
// base directamente, sin pasar por la app.
import { createHash } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import postgres from 'postgres';
import { migrar } from '../../scripts/migrar.js';
import { ALTAS, CONCEPTOS, CONTRASENA_TESORERO, SOCIOS, TESOREROS } from './datos.ts';

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

export default async function preparar() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('Las pruebas e2e necesitan DATABASE_URL');
	await migrar(url);

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		// Primero los dados de alta: sus códigos apuntan al tesorero que los creó.
		for (const u of [
			...Object.values(ALTAS),
			...Object.values(SOCIOS),
			...Object.values(TESOREROS)
		]) {
			await sql`delete from usuario where telefono = ${u.telefono} or email = ${u.email}`;
		}

		for (const socio of Object.values(SOCIOS)) {
			const [{ id }] = await sql`
				insert into usuario (nombre, telefono, email)
				values (${socio.nombre}, ${socio.telefono}, ${socio.email})
				returning id`;
			await sql`
				insert into codigo_acceso (usuario_id, codigo_hash, tipo, caduca_en)
				values (${id}, ${sha256(socio.codigo.replaceAll('-', ''))}, 'activacion', now() + interval '1 day')`;
		}

		for (const c of Object.values(CONCEPTOS)) {
			await sql`delete from concepto where nombre in (${c.nombre}, ${c.renombrado})`;
		}

		const passwordHash = await hash(CONTRASENA_TESORERO);
		for (const t of Object.values(TESOREROS)) {
			await sql`
				insert into usuario (nombre, telefono, email, password_hash, estado, es_socio, es_tesorero)
				values (${t.nombre}, ${t.telefono}, ${t.email}, ${passwordHash}, 'activo', false, true)`;
		}
	} finally {
		await sql.end();
	}
}
